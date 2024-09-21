import { MongoClient, ObjectId } from 'mongodb'
import mock from './index.mock.js'
import createJoin from './utils/createJoin.js'
import { toObjectIds, toObjectIdsSelector, fromObjectIds } from './utils/toFromObjectIds.js'
import pick from './utils/pick.js'
import { isProd } from '../utils/bools.js'
import safeMethods from './safeMethods.js'
import createAggregateStages, { createStagesCount } from './aggregates/createAggregateStages.js'


export default !isProd ? mock : {  
  async findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')

    selector = this._toObjectIdsSelector(selector)

    const doc = await this.mongo().findOne(selector, { projection: this._toProject(project), sort })

    return doc && this._create(doc)
  },

  async find(selector, {
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit,
    skip = 0,
  } = {}) {
    selector = this._toObjectIdsSelector(selector)

    const models = await this.mongo()
      .find(selector)
      .sort(sort)
      .skip(skip * limit)
      .limit(limit)
      .project(this._toProject(project))
      .toArray()

    return models.map(m => this._create(m))
  },

  async insertOne({ id, ...doc }, { project } = {}) {
    doc._id = new ObjectId(id)
    doc.createdAt = doc.updatedAt = new Date(doc.createdAt || new Date)

    doc = this._toObjectIds(doc)
    await this.mongo().insertOne(doc)
    return this._create(pick(doc, project))
  },

  async updateOne(selector, newDoc, { project } = {}) {
    if (!selector) throw new Error('respond: undefined or null selector passed to updateOne(selector)')

    const { id, createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // accept signature: updateOne(doc)

    selector = this._toObjectIdsSelector(id ? { id } : selector)

    const result = await this.mongo().findOneAndUpdate(selector, {
      $set: this._toObjectIds(doc),
      $currentDate: { updatedAt: true }
    }, { projection: this._toProject(project), returnDocument: 'after' })

    return result.value && this._create(result.value)
  },

  async upsert(selector, doc, { insertDoc, project } = {}) {
    const result = await this.mongo().findOneAndUpdate(this._toObjectIdsSelector(selector), {
      $set: this._toObjectIds(doc),
      $setOnInsert: this._toObjectIdsSelector({ ...selector, ...insertDoc, createdAt: new Date }),
      $currentDate: { updatedAt: true }
    }, { upsert: true, projection: this._toProject(project), returnDocument: 'after' })

    return result.value && this._create(result.value)
  },

  async findAll(selector, options) {
    return this._find(selector, { ...options, limit: 0 })
  },

  async findLike(key, term, { selector, ...options } = {}) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return this._find({ ...selector, [key]: value }, options)
  },

  async search(query, {
    path = ['firstName', 'lastName'],
    selector,
    project,
    limit = this.config.listLimit,
    skip = 0,
  } = {}) {
    selector = this._toObjectIdsSelector(selector)

    if (this.config.useLocalDb) {
      return this._find({ $text: { $search: query }, ...selector }, { project, skip, limit, sort: { updatedAt: 1 } })
    }

    const models = await this.mongo().aggregate([
      {
        $search: {
          index: 'nameSearch',
          text: {
            query,
            path,
            fuzzy: {
              maxEdits: 2,
              prefixLength: 1,
              maxExpansions: 100,
            }
          }
        }
      },
      ...(selector ? [{ $match: selector }] : []),
      { $skip: skip * limit },
      { $limit: limit },
      ...(project ? [{ $project: this._toProject(project) }] : []),
    ]).toArray()

    return models.map(m => this._create(m))
  },

  async searchGeo({ lng, lat }, {
    selector,
    project,
    limit = this.config.listLimit,
    skip = 0
  } = {}) {
    selector = this._toObjectIdsSelector(selector)

    if (this.config.useLocalDb) {
      return this._find(selector, { project, limit, skip, sort:  { updatedAt: 1 } }) // updateAt: 1, sorts in opposite of default direction to indicate something happened
    }
    
    const models = await this.mongo().aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          spherical: true,
          distanceField: 'distance',
          key: 'location'
        }
      },
      ...(selector ? [{ $match: selector }] : []),
      { $skip: skip * limit },
      { $limit: limit },
      ...(project ? [{ $project: this._toProject(project) }] : []),
    ]).toArray()

    return models.map(m => this._create(m))
  },

  async joinOne(id, name, {
    project,
    projectJoin,
    sort = { updatedAt: -1, _id: 1 },
  } = {}) {
    const coll = this.db(name)

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = coll._toObjectIdsSelector({ [fk]: id  }) 

    project = this._toProject(project)
    projectJoin = coll._toProject(projectJoin)

    let [parent, children] = await Promise.all([
      this._findOne(id, project),
      coll.findOne(selector, { project: projectJoin, sort }),
    ])

    return { [parentName]: parent, [name]: children }
  },


  async joinMany(id, name, {
    project,
    projectJoin,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit,
    skip = 0
  } = {}) {
    const coll = this.db(name)

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = coll._toObjectIdsSelector({ [fk]: id  }) 

    project = this._toProject(project)
    projectJoin = coll._toProject(projectJoin)

    let [parent, children] = await Promise.all([
      this._findOne(id, project),
      coll.find(selector, { project: projectJoin, sort, limit, skip }),
    ])

    return { [parentName]: parent, [coll._namePlural]: children }
  },

  async join(name, {
    foreignKey: fk,
    selector,
    selectorJoin,
    project,
    projectJoin,
    sort,
    sortJoin,
    limit = this.config.listLimit,
    limitJoin = this.config.listLimit,
    skip = 0,
    innerJoin
  } = {}) {
    sort ??= { updatedAt: -1, id: -1 }
    sortJoin ??= { updatedAt: -1, id: -1 }

    fk ??= this._name + 'Id'

    const localField = this._getIdName()
    const coll = this.db(name)

    project = this._toProject(project)
    selector = this._toObjectIdsSelector(selector)
    sort = this._toObjectIdsSelector(sort)

    projectJoin = coll._toProject(projectJoin)
    selectorJoin = coll._toObjectIdsSelector(selectorJoin)
    sortJoin = coll._toObjectIdsSelector(sortJoin)

    const stages = [
      ...(selector ? [{ $match: selector }] : []),
      { $sort: sort },
      { $skip: skip * limit },
      { $limit: limit },
      ...createJoin({
        collection: this._namePlural,
        from: name,
        foreignField: fk,
        localField,
        project,
        projectJoin,
        selector: selectorJoin,
        sort: sortJoin,
        limit: limitJoin,
        inner: innerJoin
      })
    ]

    const results = await this.mongo().aggregate(stages).next() // result of createJoin is first element in array

    const outer = this._namePlural
    const inner = coll._namePlural

    return {
      [outer]: results[outer].map(m => this._create(m)),
      [inner]: results[name].map(m => coll.create(m)),
    }
  },

  async aggregate({
    selector,
    stages: specs = [],
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit,
    skip = 0,
  } = {}) {
    const stages = createAggregateStages(specs, { collection: this, selector, project, sort, limit, skip })

    const countPromise = this.mongo().aggregate(createStagesCount(stages)).toArray()
    const docsPromise = this.mongo().aggregate(stages).toArray()

    const [counts, docs] = await Promise.all([countPromise, docsPromise])

    const count = counts[0]?.count ?? 0
    const models = docs.map(m => this._create(m))

    return { count, [this._namePlural]: models }
  },

  async count(selector) {
    return this.mongo().count(this._toObjectIdsSelector(selector))
  },

  async totalPages(selector, limit = 10) {
    const count = await this.mongo().count(this._toObjectIdsSelector(selector))
    return Math.ceil(count / limit)
  },

  async insertMany(docs) {
    return this.mongo().insertMany(docs)
  },

  async updateMany(selector, $set) {
    return this.mongo().updateMany(this._toObjectIdsSelector(selector), { $set: this._toObjectIds($set) })
  },

  async deleteMany(selector) {
    selector = this._toObjectIdsSelector(selector)
    await this.mongo().deleteMany(selector)
  },

  async deleteOne(selector) {
    selector = this._toObjectIdsSelector(selector)
    return this.mongo().deleteOne(selector)
  },

  async incrementOne(selector, $inc) {
    selector = this._toObjectIdsSelector(selector)
    return this.mongo().updateOne(selector, { $inc })
  },

  create(doc) {
    doc = { ...this._fromObjectIds(doc) }               // mongo ObjectId objects converted to strings for ez client consumption
    doc.id ??= doc._id || new ObjectId().toString()     // _id switched to id for standardized consumption (but can also be supplied in doc as `id`, eg optimistically client-side using bson library)
    delete doc._id                                      // bye bye _id
    return new this.Class(doc)
  },

  make(doc) {
    return new this.Class({ ...doc, __type: this._name })
  },

  mongo() {
    if (this._mongoCollection) return this._mongoCollection

    const connectionString = typeof this.config.connectionString === 'function' ? this.config.connectionString() : this.config.connectionString

    const client = new MongoClient(connectionString)
    const db = client.db('skins')

    return this._mongoCollection = db.collection(this._name)
  },
  
  insertSeed() {
    console.warn(`respond: db.${this._name}.insertSeed is intended for development use only`)
  },


  // stable duplicates (allows overriding non-underscored versions in userland without breaking other methods that use them)

  async _findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')

    selector = this._toObjectIdsSelector(selector)

    const doc = await this.mongo().findOne(selector, { projection: this._toProject(project), sort })

    return doc && this._create(doc)
  },

  async _find(selector, {
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit,
    skip = 0,
  } = {}) {
    selector = this._toObjectIdsSelector(selector)

    const models = await this.mongo()
      .find(selector)
      .sort(sort)
      .skip(skip * limit)
      .limit(limit)
      .project(this._toProject(project))
      .toArray()

    return models.map(m => this._create(m))
  },

  async _insertOne({ id, ...doc }, { project } = {}) {
    doc._id = new ObjectId(id)
    doc.createdAt = doc.updatedAt = new Date(doc.createdAt || new Date)

    doc = this._toObjectIds(doc)
    await this.mongo().insertOne(doc)
    return this._create(pick(doc, project))
  },

  async _updateOne(selector, newDoc, { project } = {}) {
    if (!selector) throw new Error('respond: undefined or null selector passed to updateOne(selector)')

    const { id, createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // accept signature: updateOne(doc)

    selector = this._toObjectIdsSelector(id ? { id } : selector)

    const result = await this.mongo().findOneAndUpdate(selector, {
      $set: this._toObjectIds(doc),
      $currentDate: { updatedAt: true }
    }, { projection: this._toProject(project), returnDocument: 'after' })


    return result.value && this._create(result.value)
  },

  _create(doc) {
    doc = { ...this._fromObjectIds(doc) }         // mongo ObjectId objects converted to strings for ez client consumption
    doc.id ??= doc._id || new ObjectId().toString()     // _id switched to id for standardized consumption (but can also be supplied in doc as `id`, eg optimistically client-side using bson library)
    delete doc._id                                      // bye bye _id
    return new this.Class(doc)
  },


  // OVERRIDEABLE UTILS: _id <-> id conversion utils (can be overriden in userland -- eg: external datasource facade that has 'id' keys)

  _getIdName() {
    return '_id'
  },

  _toObjectIds(doc) {
    return toObjectIds(doc)
  },

  _fromObjectIds(doc) {
    return fromObjectIds(doc)
  },

  _toObjectIdsSelector(selector) {
    return toObjectIdsSelector(selector)
  },

  _toProject(project) {
    if (project?.id !== undefined) {
      const { id, ...proj } = project
      return { ...proj, _id: id }
    }

    return project
  },

  ...safeMethods
}
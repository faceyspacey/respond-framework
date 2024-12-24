import { isProd } from '../helpers/constants.js'
import { MongoClient, ObjectId } from 'mongodb'
import mock from './index.mock.js'

import createJoin from './aggregates/createJoin.js'
import { toObjectIds, toObjectIdsSelector, fromObjectIds, toProject } from './helpers/toFromObjectIds.js'
import createAggregateStages, { createStagesCount } from './aggregates/createAggregateStages.js'
import createAggregatePaginatedSelector from './helpers/createAggregatePaginatedSelector.js'
import safeMethods from './safeMethods.js'


export default !isProd ? mock : {  
  async findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error(`You are passing undefined to db.${this._name}.findOne()!`)

    selector = toObjectIdsSelector(selector)

    const doc = await this.mongo().findOne(selector, { projection: toProject(project), sort })

    return doc && this._create(doc)
  },

  async findMany(selector, {
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
  } = {}) {
    selector = toObjectIdsSelector(selector)

    const models = await this.mongo()
      .find(selector)
      .sort(sort)
      .skip(skip * limit)
      .limit(limit)
      .project(toProject(project))
      .toArray()

    return models.map(m => this._create(m))
  },

  async insertOne({ id, ...doc }) {
    doc._id = new ObjectId(id)
    doc.createdAt = doc.updatedAt = new Date(doc.createdAt || new Date)

    doc = toObjectIds(doc)
    await this.mongo().insertOne(doc)
    return this._create(doc)
  },

  async updateOne(selector, newDoc, { project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // accept signature: updateOne(doc)

    selector = toObjectIdsSelector(id ? { id } : selector)

    const result = await this.mongo().findOneAndUpdate(selector, {
      $set: toObjectIds(doc),
      $currentDate: { updatedAt: true }
    }, { projection: toProject(project), returnDocument: 'after' })

    return result.value && this._create(result.value)
  },

  async upsert(selector, newDoc, { insertDoc, project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // upsert accepts this signature: upsert(doc)

    selector = toObjectIdsSelector(id ? { id } : selector)
    insertDoc = toObjectIdsSelector(insertDoc)

    const sel = typeof selector === 'object' ? selector : undefined

    const result = await this.mongo().findOneAndUpdate(selector, {
      $set: toObjectIds(doc),
      $setOnInsert: { ...sel, ...insertDoc, createdAt: new Date },
      $currentDate: { updatedAt: true }
    }, { upsert: true, projection: toProject(project), returnDocument: 'after' })

    return result.value && this._create(result.value)
  },

  async findAll(selector, options) {
    return this._findMany(selector, { ...options, limit: 0 })
  },

  async findLike(key, term, { selector, ...options } = {}) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return this._findMany({ ...selector, [key]: value }, options)
  },

  async findManyPaginated(selector, options) {
    skip = skip ? parseInt(skip) : 0

    const [models, count] = await Promise.all([
      this._findMany(selector, { ...options, skip }),
      this.count(selector)
    ])

    return { [this._namePlural]: models, count, skip }
  },
  
  async search(query, {
    path = ['firstName', 'lastName'],
    selector,
    project,
    limit = this.config.listLimit ?? 10,
    skip = 0,
  } = {}) {
    selector = toObjectIdsSelector(selector)

    if (this.config.useLocalDb) {
      return this._findMany({ $text: { $search: query }, ...selector }, { project, skip, limit, sort: { updatedAt: 1 } })
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
      ...(project ? [{ $project: toProject(project) }] : []),
    ]).toArray()

    return models.map(m => this._create(m))
  },

  async searchGeo({ lng, lat }, {
    selector,
    project,
    limit = this.config.listLimit ?? 10,
    skip = 0
  } = {}) {
    selector = toObjectIdsSelector(selector)

    if (this.config.useLocalDb) {
      return this._findMany(selector, { project, limit, skip, sort:  { updatedAt: 1 } }) // updateAt: 1, sorts in opposite of default direction to indicate something happened
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
      ...(project ? [{ $project: toProject(project) }] : []),
    ]).toArray()

    return models.map(m => this._create(m))
  },

  async joinOne(id, name, {
    project,
    projectJoin,
    sort = { updatedAt: -1, _id: 1 },
  } = {}) {
    const coll = this.db[name]

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = toObjectIdsSelector({ [fk]: id  }) 

    project = toProject(project)
    projectJoin = toProject(projectJoin)

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
    limit = this.config.listLimit ?? 10,
    skip = 0
  } = {}) {
    const coll = this.db[name]

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = toObjectIdsSelector({ [fk]: id  }) 

    project = toProject(project)
    projectJoin = toProject(projectJoin)

    let [parent, children] = await Promise.all([
      this._findOne(id, project),
      coll.findMany(selector, { project: projectJoin, sort, limit, skip }),
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
    limit = this.config.listLimit ?? 10,
    limitJoin = this.config.listLimit ?? 10,
    skip = 0,
    innerJoin
  } = {}) {
    sort ??= { updatedAt: -1, id: -1 }
    sortJoin ??= { updatedAt: -1, id: -1 }

    fk ??= this._name + 'Id'

    const localField = '_id'
    const coll = this.db[name]

    project = toProject(project)
    selector = toObjectIdsSelector(selector)
    sort = toObjectIdsSelector(sort)

    projectJoin = toProject(projectJoin)
    selectorJoin = toObjectIdsSelector(selectorJoin)
    sortJoin = toObjectIdsSelector(sortJoin)

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
    stages: specs = [], // stages in userland are respond-specific "specs" which abstracts the underlying implementation
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
    query, // optional query object passed from client via aggregatePaginated for matching results to the original query for caching/pagination in reducers
  } = {}) {
    const stages = createAggregateStages(specs, { collection: this, selector, project, sort, limit, skip })

    const countPromise = this.mongo().aggregate(createStagesCount(stages)).toArray()
    const docsPromise = this.mongo().aggregate(stages).toArray()

    const [counts, docs] = await Promise.all([countPromise, docsPromise])

    const count = counts[0]?.count ?? 0
    const models = docs.map(m => this._create(m))

    return { query, count, [this._namePlural]: models }
  },

  async aggregatePaginated(query) {
    const {
      project,
      sortKey = 'updatedAt',
      sortValue = -1,
      limit,
      skip = 0,
      startDate,
      endDate,
      location,
      ...sel
    } = query
  
    const selector = createAggregatePaginatedSelector(toObjectIdsSelector(sel)) // clear unused params, transform regex strings, date handling
    const sort = { [sortKey]: sortValue, _id: sortValue, location }
    const stages = this.aggregateStages?.map(s => ({ ...s, startDate, endDate }))
  
    return this.aggregate({ selector, sort, stages, project, limit, skip, query })
  },

  async count(selector) {
    return this.mongo().count(toObjectIdsSelector(selector))
  },

  async totalPages(selector, limit = 10) {
    const count = await this.mongo().count(toObjectIdsSelector(selector))
    return Math.ceil(count / limit)
  },

  async insertMany(docs) {
    return this.mongo().insertMany(docs)
  },

  async updateMany(selector, $set) {
    return this.mongo().updateMany(toObjectIdsSelector(selector), { $set: toObjectIds($set) })
  },

  async deleteMany(selector) {
    selector = toObjectIdsSelector(selector)
    await this.mongo().deleteMany(selector)
  },

  async deleteOne(selector) {
    selector = toObjectIdsSelector(selector)
    return this.mongo().deleteOne(selector)
  },

  async incrementOne(selector, $inc) {
    selector = toObjectIdsSelector(selector)
    return this.mongo().updateOne(selector, { $inc })
  },

  create(doc) {
    doc = { ...fromObjectIds(doc) }               // mongo ObjectId objects converted to strings for ez client consumption
    doc.id ??= doc._id || new ObjectId().toString()     // _id switched to id for standardized consumption (but can also be supplied in doc as `id`, eg optimistically client-side using bson library)
    delete doc._id                                      // bye bye _id
    return this.make(doc)
  },

  mongo() {
    if (this._mongoCollection) return this._mongoCollection

    const str = typeof this.config.connectionString === 'function' ? this.config.connectionString() : this.config.connectionString
    const dbName = this.config.dbName ?? str.slice(str.lastIndexOf('/') + 1).split('?')[0] ?? 'app'

    const client = new MongoClient(str)
    const db = client.db(dbName)

    return this._mongoCollection = db.collection(this._name)
  },
  
  insertSeed() {
    console.warn(`respond: db.${this._name}.insertSeed is intended for development use only`)
  },


  // stable duplicates (allows overriding non-underscored versions in userland without breaking other methods that use them)

  async _findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error(`You are passing undefined to db.${this._name}.findOne()!`)

    selector = toObjectIdsSelector(selector)

    const doc = await this.mongo().findOne(selector, { projection: toProject(project), sort })

    return doc && this._create(doc)
  },

  async _findMany(selector, {
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
  } = {}) {
    selector = toObjectIdsSelector(selector)

    const models = await this.mongo()
      .find(selector)
      .sort(sort)
      .skip(skip * limit)
      .limit(limit)
      .project(toProject(project))
      .toArray()

    return models.map(m => this._create(m))
  },

  async _insertOne({ id, ...doc }) {
    doc._id = new ObjectId(id)
    doc.createdAt = doc.updatedAt = new Date(doc.createdAt || new Date)

    doc = toObjectIds(doc)
    await this.mongo().insertOne(doc)
    return this._create(doc)
  },

  async _updateOne(selector, newDoc, { project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // accept signature: updateOne(doc)

    selector = toObjectIdsSelector(id ? { id } : selector)

    const result = await this.mongo().findOneAndUpdate(selector, {
      $set: toObjectIds(doc),
      $currentDate: { updatedAt: true }
    }, { projection: toProject(project), returnDocument: 'after' })

    return result.value && this._create(result.value)
  },

  _create(doc) {
    doc = { ...fromObjectIds(doc) }         // mongo ObjectId objects converted to strings for ez client consumption
    doc.id ??= doc._id || new ObjectId().toString()     // _id switched to id for standardized consumption (but can also be supplied in doc as `id`, eg optimistically client-side using bson library)
    delete doc._id                                      // bye bye _id
    return this.make(doc)
  },

  super(method, ...args) {
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(this))
    return proto[method].apply(this, args)
  },

  ...safeMethods
}
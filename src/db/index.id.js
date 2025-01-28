import { MongoClient, ObjectId } from 'mongodb'
import { isDev } from '../helpers/constants.js'
import mock from './index.mock.js'

import { toObjectIds, fromObjectIds, toIdSelector } from './helpers/toFromObjectIds.js'
import createQuerySelector from './helpers/createQuerySelector.js'
import safeMethods from './safeMethods.js'
import createQueryKey from './helpers/createQueryKey.js'


export default isDev ? mock :  {
  create({ _id, ...doc } = {}) { // in standard collections, _id would become id, but here we just use iGolf's id
    return new this.Model({ ...fromObjectIds(doc) }, false)
  },

  async insertOne(doc) { // id not removed!, regular signature: async insertOne({ id, ...doc }) {
    doc._id = new ObjectId()
    doc.createdAt = doc.updatedAt = new Date(doc.createdAt || new Date)

    doc = toObjectIds(doc)

    await this.mongo().insertOne(doc)
    return this.create(doc)
  },

  async findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    selector = typeof selector === 'string' ? { id: selector } : selector
    const doc = await this.mongo().findOne(selector, { projection: project, sort })
    if (doc) this._markSeen(doc.id) // mark seen utilities so admin panel floats courses/cities to top of ListView
    return doc && this.create(doc)
  },

  async findMany(selector, {
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
  } = {}) {
    const models = await this.mongo()
      .find(selector)
      .sort(sort)
      .skip(skip * limit)
      .limit(limit)
      .project(project)
      .toArray()

    return models.map(m => this.create(m))
  },

  async findLike(key, term, { selector, ...options } = {}) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return this.findMany({ ...selector, [key]: value }, options)
  },
  
  async updateOne(sel = {}, newDoc, { project } = {}) {
    const selector = toIdSelector(sel)
    const { createdAt: _, updatedAt: __, ...doc } = newDoc ?? sel    // accept signature: updateOne(doc)

    const result = await this.mongo().findOneAndUpdate(selector, {
      $set: toObjectIds(doc),
      $currentDate: { updatedAt: true }
    }, { projection: project, returnDocument: 'after' })

    return result.value
      ? this.create(result.value)
      : selector.id ? this.insertOne({ id: selector.id, ...doc }, { project }) : undefined      // honor id: client-created id or deleted doc
  },

  async upsert(sel = {}, newDoc, { insertDoc, project } = {}) {
    const selector = toIdSelector(sel)
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || sel    // upsert accepts this signature: upsert(doc)

    const result = await this.mongo().findOneAndUpdate(selector, {
      $set: toObjectIds(doc),
      $setOnInsert: { ...selector, ...insertDoc, createdAt: new Date },
      $currentDate: { updatedAt: true }
    }, { upsert: true, projection: project, returnDocument: 'after' })

    return result.value && this.create(result.value)
  },

  save(model) {
    return this.upsert(model)
  },

  make(doc) {
    const revived = this.db.revive(doc)
    return new this.Model(revived, false)
  },

  async incrementOne(selector, $inc) {
    return this.mongo().updateOne(toIdSelector(selector), { $inc })
  },

  async count(selector) {
    return this.mongo().count(toObjectIds(selector))
  },
  
  async totalPages(selector, limit = this.config.listLimit ?? 10) {
    const count = await this.mongo().count(toObjectIds(selector))
    return Math.ceil(count / limit)
  },

  async updateMany(selector, $set) {
    return this.mongo().updateMany(toObjectIds(selector), { $set: toObjectIds($set) })
  },

  async deleteMany(selector) {
    await this.mongo().deleteMany(toObjectIds(selector))
  },

  async deleteOne(selector) {
    return this.mongo().deleteOne(toIdSelector(selector))
  },

  async findAll(selector, options) {
    return this.super.findMany(selector, { ...options, limit: 0 })
  },

  async findManyPaginated(selector, options = {}) {
    const skip = options.skip ? parseInt(options.skip) : 0

    const [models, count] = await Promise.all([
      this.super.findMany(selector, { ...options, skip }),
      this.count(selector)
    ])

    return { [this._namePlural]: models, count, skip }
  },

  async queryPaginated(query, { project } = {}) {
    const {
      sortKey = 'updatedAt',
      sortValue = -1,
      limit = this.config.listLimit ?? 10,
      skip = 0,
      location,
      ...sel
    } = query
    
    const selector = this.createQuerySelector(sel) // advanced filtering suitable for an admin panel
    const sort = { [sortKey]: sortValue, location }

    const [count, models] = await Promise.all([
      this.count(selector),
      location ? this.searchGeo(location, { selector, project, limit, skip }) : this.findMany(selector, { project, sort, limit, skip })
    ])

    const total = Math.ceil(count / limit)

    const hasNext = skip + 1 < total
    const next = hasNext ? skip + 1 : null

    return {
      query,
      count,
      total,
      next,
      index: skip,
      [this._namePlural]: models,
      page: models.map(m => m.id),
      key: this.createQueryKey(query)
    }
  },


  async search(query, {
    path = ['firstName', 'lastName'],
    selector,
    project,
    limit = this.config.listLimit ?? 10,
    skip = 0,
  } = {}) {
    selector = toObjectIds(selector)

    if (this.config.useLocalDb) {
      return this.super.findMany({ $text: { $search: query }, ...selector }, { project, skip, limit, sort: { updatedAt: 1 } })
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
      ...(project ? [{ $project: project }] : []),
    ]).toArray()

    return models.map(m => this.super.create(m))
  },

  async searchGeo({ lng, lat }, {
    selector,
    project,
    limit = this.config.listLimit ?? 10,
    skip = 0
  } = {}) {
    selector = toObjectIds(selector)

    if (this.config.useLocalDb) {
      return this.super.findMany(selector, { project, limit, skip, sort:  { updatedAt: 1 } }) // updateAt: 1, sorts in opposite of default direction to indicate something happened
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
      ...(project ? [{ $project: project }] : []),
    ]).toArray()

    return models.map(m => this.super.create(m))
  },

  async joinOne(id, name, {
    project,
    projectJoin,
    sort = { updatedAt: -1, _id: 1 },
  } = {}) {
    const coll = this.db[name]

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = toObjectIds({ [fk]: id }) 

    let [parent, children] = await Promise.all([
      this.super.findOne(id, project),
      coll.super.findOne(selector, { project: projectJoin, sort }),
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

    const selector = toObjectIds({ [fk]: id  }) 

    let [parent, children] = await Promise.all([
      this.super.findOne(id, project),
      coll.super.findMany(selector, { project: projectJoin, sort, limit, skip }),
    ])

    return { [parentName]: parent, [coll._namePlural]: children }
  },

  mongo() {
    if (this._mongoCollection) return this._mongoCollection

    const str = typeof this.config.dbConnectionString === 'function' ? this.config.dbConnectionString() : this.config.dbConnectionString
    const dbName = this.config.dbName ?? str.slice(str.lastIndexOf('/') + 1).split('?')[0] ?? 'app'

    const client = new MongoClient(str)
    const db = client.db(dbName)

    return this._mongoCollection = db.collection(this._name)
  },

  insertSeed() {
    console.warn(`respond: db.${this._name}.insertSeed is intended for development use only`)
  },

  get super() {
    if (this._super) return this._super

    const proto = Object.getPrototypeOf(this)

    return this._super = new Proxy({}, {
      get: (_, k) => proto[k].bind(this)
    })
  },

  clone() {
    return Object.defineProperties(Object.create(this.parent), Object.getOwnPropertyDescriptors(this))
  },

  createQuerySelector,
  createQueryKey,
  ...safeMethods,
}
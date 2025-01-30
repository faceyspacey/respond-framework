import { generateId } from '../helpers/deterministicCounter.js'
import applySelector from './utils/applySelector.js'
import sortDocs from './utils/sortDocs.js'
import { pickAndCreate as pick } from './utils/pick.js'
import createAggregateStages from './aggregates/createAggregateStages.mock.js'
import createQuerySelector from './helpers/createQuerySelector.js'
import safeMethods from './safeMethods.js'
import cloneDeep from '../proxy/helpers/cloneDeep.js'
import createQueryKey from './helpers/createQueryKey.js'


export default {
  async findOne(selector = {}, { project, sort = { updatedAt: -1 } } = {}) {
    if (typeof selector === 'string') return pick(this.docs[selector], project, this)
    if (selector.id) return pick(this.docs[selector.id], project, this)

    const models = await this.super.findMany(selector, { project, sort, limit: 1 })
    return models[0]
  },

  async findMany(selector, {
    project,
    sort = { updatedAt: -1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
    docs = Object.values(this.docs || {}) // methods like aggregate pass in their own docs (development only)
  } = {}) {
    const start = skip * limit
    const end = start + limit

    docs = sortDocs(docs.filter(applySelector(selector)), sort)
    docs = limit === 0 ? docs.slice(start) : docs.slice(start, end)
    
    return docs.map(doc => pick(doc, project, this))
  },

  async insertOne({ ...doc }, { project } = {}) {
    doc.id ??= generateId() // if id present, client generated client side optimistically
    doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

    this.docs[doc.id] = this.super.create(doc)
    return project ? pick(this.docs[doc.id], project, this) : this.docs[doc.id]
  },

  async updateOne(selector, newDoc, { project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // updateOne accepts this signature: updateOne(doc)

    const model = await this.super.findOne(id || selector)
    if (!model) return id ? this.super.insertOne({ id, ...doc }, { project }) : undefined // honor id: client-created id or deleted doc

    Object.defineProperties(model, Object.getOwnPropertyDescriptors(doc))
    model.updatedAt = new Date
    this.docs[model.id] = model

    return pick(model, project, this)
  },

  async upsert(selector, newDoc, { insertDoc, project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // upsert accepts this signature: upsert(doc)

    const existingDoc = await this.super.findOne(id || selector)

    if (existingDoc) {
      doc.updatedAt = new Date
      this.docs[existingDoc.id] = Object.assign(existingDoc, doc)
      return this.super.findOne(selector, { project })
    }

    const sel = typeof selector === 'object' ? selector : undefined
    return this.super.insertOne({ ...sel, ...doc, ...insertDoc }, { project })
  },

  async findAll(selector, options) {
    return this.super.findMany(selector, { ...options, limit: 0 })
  },

  async findLike(key, term, { selector, ...options } = {}) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return this.super.findMany({ ...selector, [key]: value }, options)
  },

  async findManyPaginated(selector, options = {}) {
    const skip = options.skip ? parseInt(options.skip) : 0

    const [models, count] = await Promise.all([
      this.super.findMany(selector, { ...options, skip }),
      this.count(selector)
    ])

    return { [this._namePlural]: models, count, skip }
  },

  async search(query, {
    path = ['firstName', 'lastName'],
    selector,
    ...options
  } = {}) {
    const allRows = await this.super.findMany(selector, { ...options, sort: { updatedAt: -1 } })

    query = query.replace(/[\W_]+/g, '')    // remove non-alphanumeric characters

    return allRows.filter(r => {
      const reg = new RegExp(query, 'i')
      return path.find(k => reg.test(r[k]))
    })
  },

  async searchGeo({ lng, lat }, { selector, ...options } = {}) {
    return this.super.findMany(selector, options)
  },

  async joinOne(id, name, {
    project,
    projectJoin,
    sort = { updatedAt: -1, _id: 1 },
  } = {}) {
    const coll = this.db[name]

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this.super.findOne(id, { project }),
      coll.super.findOne(selector, { project: projectJoin, sort })
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

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this.super.findOne(id, project),
      coll.super.findMany(selector, { project: projectJoin, sort, limit, skip })
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
    
    let parents = await this.super.findMany(selector, { project, sort, limit, skip })
    const $in = parents.map(p => p.id)

    selectorJoin = { ...selectorJoin, [fk]: { $in } }

    const coll = this.db[name]
    const children = await coll.super.findMany(selectorJoin, { project: projectJoin, sort: sortJoin, limit: limitJoin }) 
    
    const outer = this._namePlural
    const inner = coll._namePlural

    if (innerJoin) {
      parents = parents.filter(p => children.find(c => c[fk] === p.id))
    }

    return {
      [outer]: parents,
      [inner]: children,
    }
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

    const count = await this.count(selector)
    const models = await this.findMany(selector, { project, sort, limit, skip })
  
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

  async aggregatePaginated(query, { project } = {}) {
    const {
      sortKey = 'updatedAt',
      sortValue = -1,
      limit = this.config.listLimit ?? 10,
      skip = 0,
      startDate,
      endDate,
      location,
      ...sel
    } = query
  
    const selector = this.createQuerySelector(sel) // clear unused params, transform regex strings, date handling
    const sort = { [sortKey]: sortValue, location }

    const stages = this.aggregateStages?.map(s => ({ ...s, startDate, endDate }))
    const { count, [this._namePlural]: models } = await this.super.aggregate({ selector, stages, project, sort, limit, skip })

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

  async aggregate({
    selector,
    stages: specs = [], // stages in userland are respond-specific "specs" which abstracts the underlying implementation
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
  } = {}) {
    const docs = await createAggregateStages(specs, { db: this.db, collectionName: this._name, selector, sort }) // mock fully converts stage specs into docs themselves (non-paginated)
    const models = await this.super.findMany(undefined, { project, sort, limit, skip, docs }) // apply pagination and sorting on passed in models

    return { count: docs.length, [this._namePlural]: models }
  },

  async count(selector) {
    return Object.values(this.docs).filter(applySelector(selector)).length
  },

  async totalPages(selector, limit = this.config.listLimit ?? 10) {
    const count = Object.values(this.docs).filter(applySelector(selector)).length
    return Math.ceil(count / limit)
  },

  async insertMany(docs) {
    for (const doc of docs) {
      doc.id ??= generateId()
      doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

      this.docs[doc.id] = this.super.create(doc)
    }

    return { acknowledged: true }
  },

  async updateMany(selector, doc) {
    const models = await this.super.findMany(selector)
    models.forEach(m => m.save(doc))
    return { acknowledged: true }
  },

  async deleteMany(selector) {
    const models = await this.super.findMany(selector)
    models.forEach(m => delete this.docs[m.id])
    return { acknowledged: true }
  },

  async deleteOne(selector) {
    let id = typeof selector === 'string'
      ? selector
      : selector.id
    
    if (!id) {
      const model = await this.super.findOne(selector)
      id = model?.id
    }

    delete this.docs[id]

    return { acknowledged: true }
  },

  async incrementOne(selector, $inc) {
    const model = await this.super.findOne(selector)

    const doc = { updatedAt: new Date }

    Object.keys($inc).forEach(k => {
      const v = model[k] || 0 // todo: support nested fields
      doc[k] = v + $inc[k]
    })
    
    await this.super.updateOne(selector, doc)

    return { acknowledged: true }
  },

  create(doc) {
    const revived = this.db.revive(doc)
    return new this.Model(revived)
  },

  make(doc) {
    const revived = this.db.revive(doc)
    return new this.Model(revived, false)
  },

  save(model) {
    return this.upsert(model)
  },

  insertSeed(docsObject = {}) {
    const name = this._name

    this.docs ??= {}

    const docs = Array.isArray(docsObject) ? docsObject : Object.values(docsObject)
    const now = new Date().getTime() - (docs.length * 1000) // set clock back in time

    docs.forEach((doc, i) => {
      doc = cloneDeep(doc)
      
      doc.id ??= generateId()
      doc.__type = name

      doc.createdAt ??= new Date(now - (i * 1000)) // put first docs in seed at top of lists (when sorted by updatedAt: -1)
      doc.updatedAt ??= doc.createdAt

      this.docs[doc.id] = doc
    })

    return this.docs
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
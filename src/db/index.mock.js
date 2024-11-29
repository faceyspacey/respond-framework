import ObjectId from '../utils/objectIdDevelopment.js'
import applySelector from './utils/applySelector.js'
import sortDocs from './utils/sortDocs.js'
import pick from './utils/pick.js'
import createAggregateStages from './aggregates/createAggregateStages.mock.js'
import { isServer } from '../utils/bools.js'
import createQuerySelector from './utils/createQuerySelector.js'


export default {
  async findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')
    if (typeof selector === 'string') return this._pick(this.docs[selector], project)
    if (selector.id) return this._pick(this.docs[selector.id], project)

    const models = await this._findMany(selector, { project, sort, limit: 1 })
    return models[0]
  },

  async findMany(selector, {
    project,
    sort = { updatedAt: -1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
  } = {}) {
    const start = skip * limit
    const end = start + limit

    let docs = Object.values(this.docs || {})

    docs = sortDocs(docs.filter(applySelector(selector)), sort)
    docs = limit === 0 ? docs.slice(start) : docs.slice(start, end)
    
    return docs.map(doc => this._pick(doc, project))
  },

  async insertOne(doc, { project } = {}) {
    doc.id ??= ObjectId() // if id present, client generated client side optimistically
    doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

    this.docs[doc.id] = this._create(doc)
    return this._pick(this.docs[doc.id], project)
  },

  async updateOne(selector, newDoc, { project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // updateOne accepts this signature: updateOne(doc)

    const model = await this._findOne(id || selector)
    if (!model) return

    Object.defineProperties(model, Object.getOwnPropertyDescriptors(doc)) // todo: make deep merge (maybe)
    model.updatedAt = new Date
    this.docs[model.id] = model

    return this._pick(model, project)
  },

  async upsert(selector, newDoc, { insertDoc, project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // upsert accepts this signature: upsert(doc)

    const existingDoc = await this._findOne(id || selector)

    if (existingDoc) {
      doc.updatedAt = new Date
      this.docs[existingDoc.id] = Object.assign(existingDoc, doc)
      return this._findOne(selector, { project })
    }

    const sel = typeof selector === 'object' ? selector : undefined
    return this._insertOne({ ...sel, ...doc, ...insertDoc }, { project })
  },

  async findAll(selector, options) {
    return this._findMany(selector, { ...options, limit: 0 })
  },

  async findLike(key, term, { selector, ...options } = {}) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return this._findMany({ ...selector, [key]: value }, options)
  },

  async findPaginated(selector, options) {
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
    ...options
  } = {}) {
    const allRows = await this._findMany(selector, { ...options, sort: { updatedAt: -1 } })

    query = query.replace(/[\W_]+/g, '')    // remove non-alphanumeric characters

    return allRows.filter(r => {
      const reg = new RegExp(query, 'i')
      return path.find(k => reg.test(r[k]))
    })
  },

  async searchGeo({ lng, lat }, { selector, ...options } = {}) {
    return this._findMany(selector, options)
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
      this._findOne(id, { project }),
      coll.findOne(selector, { project: projectJoin, sort })
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
      this._findOne(id, project),
      coll.findMany(selector, { project: projectJoin, sort, limit, skip })
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
    
    let parents = await this._findMany(selector, { project, sort, limit, skip })
    const $in = parents.map(p => p.id)

    selectorJoin = { ...selectorJoin, [fk]: { $in } }

    const coll = this.db[name]

    const children = await coll.findMany(selectorJoin, { project: projectJoin, sort: sortJoin, limit: limitJoin }) 
    
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

  async aggregate({
    selector,
    stages: specs = [], // stages in userland are respond-specific "specs" which abstracts the underlying implementation
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
    query // optional query object passed from client via aggregatePaginated for matching results to the original query for caching/pagination in reducers
  } = {}) {
    const docs = await createAggregateStages(specs, { db: this.db, collectionName: this._name, selector, sort }) // mock fully converts stage specs into docs themselves (non-paginated)
    const page = await this._findMany(undefined, { project, sort, limit, skip, docs }) // apply pagination and sorting on passed in models

    return { query, count: docs.length, [this._namePlural]: page }
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
  
    const selector = createQuerySelector(sel) // clear unused params, transform regex strings, date handling
    const sort = { [sortKey]: sortValue, _id: sortValue, location }
    const stages = this.aggregateStages?.map(s => ({ ...s, startDate, endDate }))
  
    return this.aggregate({ selector, sort, stages, project, limit, skip, query })
  },

  async count(selector) {
    return Object.values(this.docs).filter(applySelector(selector)).length
  },

  async totalPages(selector, limit = 10) {
    const count = Object.values(this.docs).filter(applySelector(selector)).length
    return Math.ceil(count / limit)
  },

  async insertMany(docs) {
    for (const doc of docs) {
      doc.id ??= ObjectId()
      doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

      this.docs[doc.id] = this._create(doc)
    }

    return { acknowledged: true }
  },

  async updateMany(selector, doc) {
    const models = await this._findMany(selector)
    models.forEach(m => m.save(doc))
    return { acknowledged: true }
  },

  async deleteMany(selector) {
    const models = await this._findMany(selector)
    models.forEach(m => delete this.docs[m.id])
    return { acknowledged: true }
  },

  async deleteOne(selector) {
    let id = typeof selector === 'string'
      ? selector
      : selector.id
    
    if (!id) {
      const model = await this._findOne(selector)
      id = model?.id
    }

    delete this.docs[id]

    return { acknowledged: true }
  },

  async incrementOne(selector, $inc) {
    const model = await this._findOne(selector)

    const doc = {}

    Object.keys($inc).forEach(k => {
      const v = model[k] || 0 // todo: support nested fields
      doc[k] = v + $inc[k]
    })
    
    await this._updateOne(selector, doc)

    return { acknowledged: true }
  },

  create(doc) {
    const id = doc?.id || ObjectId()
    return this.make({ ...doc, id })
  },

  insertSeed(docsObject = {}) {
    const name = this._name

    if (!isServer && window.opener) {
      return this.docs = window.opener.state.respond.replays.db[name].docs ?? {} // child window shares db/seed with parent
    }

    this.docs ??= {}

    const docs = Array.isArray(docsObject) ? docsObject : Object.values(docsObject)
    const now = new Date().getTime() - (docs.length * 1000) // set clock back in time

    docs.forEach((doc, i) => {
      doc.id ??= ObjectId()
      doc.__type = name

      doc.createdAt ??= new Date(now - (i * 1000)) // put first docs in seed at top of lists (when sorted by updatedAt: -1)
      doc.updatedAt ??= doc.createdAt

      this.docs[doc.id] = doc
    })

    return this.docs
  },


  // stable duplicates (allows overriding non-underscored versions in userland without breaking other methods that use them)

  async _findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')
    if (typeof selector === 'string') return this._pick(this.docs[selector], project)
    if (selector.id) return this._pick(this.docs[selector.id], project)
  
    const models = await this._findMany(selector, { project, sort, limit: 1 })
    return models[0]
  },
  
  async _findMany(selector, {
    project,
    sort = { updatedAt: -1 },
    limit = this.config.listLimit ?? 10,
    skip = 0,
    docs = Object.values(this.docs || {}) // methods like aggregate pass in their own docs
  } = {}) {
    const start = skip * limit
    const end = start + limit
  
    docs = sortDocs(docs.filter(applySelector(selector)), sort)
    docs = limit === 0 ? docs.slice(start) : docs.slice(start, end)
    
    return docs.map(doc => this._pick(doc, project))
  },
  
  async _insertOne(doc, { project } = {}) {
    doc.id ??= ObjectId() // if id present, client generated client side optimistically
    doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date
  
    this.docs[doc.id] = this._create(doc)
    return this._pick(this.docs[doc.id], project)
  },
  
  async _updateOne(selector, newDoc, { project } = {}) {
    const id = typeof selector === 'string' ? selector : selector.id
    const { createdAt: _, updatedAt: __, ...doc } = newDoc || selector    // updateOne accepts this signature: updateOne(doc)

    const model = await this._findOne(id || selector)
    if (!model) return

    Object.defineProperties(model, Object.getOwnPropertyDescriptors(doc)) // todo: make deep merge (maybe)
    model.updatedAt = new Date
    this.docs[model.id] = model

    return this._pick(model, project)
  },

  _create(doc) {
    const id = doc?.id || ObjectId()
    return this.make({ ...doc, id })
  },


  // utils

  _pick(doc, project) {
    const picked = pick(doc, project)
    return picked ? this._create(picked) : undefined
  },


  // production methods for resolving id <-> _id

  _getIdName() {
    return 'id'
  },

  _toObjectIds(doc) {
    return doc
  },

  _fromObjectIds(doc) {
    return doc
  },

  _toObjectIdsSelector(selector) {
    return selector
  },

  _toProject(project) {
    return project
  },
}
import objectId from '../utils/objectIdDevelopment.js'
import applySelector from './utils/applySelector.js'
import sortDocs from './utils/sortDocs.js'
import pick from './utils/pick.js'
import safeMethods from './safeMethods.js'
import createAggregateStages from './aggregates/createAggregateStages.mock.js'
import { isServer } from '../utils/bools.js'


export default {
  async findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')
    if (typeof selector === 'string') return this._pick(this.docs[selector], project)
    if (selector.id) return this._pick(this.docs[selector.id], project)

    const models = await this._find(selector, { project, sort, limit: 1 })
    return models[0]
  },

  async find(selector, {
    project,
    sort = { updatedAt: -1 },
    limit = this.config.listLimit,
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
    doc.id ??= objectId() // if id present, client generated client side optimistically
    doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

    this.docs[doc.id] = this._create(doc)
    return this._pick(this.docs[doc.id], project)
  },

  async updateOne(selector, newDoc, { project } = {}) {
    if (!selector) throw new Error('respond: undefined or null selector passed to updateOne(selector)')

    const id = typeof selector === 'string' ? selector : selector.id
    const { id: _, ...doc } = newDoc || selector    // updateOne accepts this signature: updateOne(doc)

    const model = await this._findOne(id || selector)

    if (model) {
      Object.defineProperties(model, Object.getOwnPropertyDescriptors(doc)) // todo: make deep merge (maybe)
      model.updatedAt = new Date
      this.docs[model.id] = model
    }

    return this._pick(model, project)
  },

  async upsert(selector, doc, { insertDoc, project } = {}) {
    const existingDoc = await this._findOne(selector)

    if (existingDoc) {
      doc.updatedAt = new Date

      Object.assign(existingDoc, doc)
      this.docs[existingDoc.id] = existingDoc
      
      return this._findOne(selector, project)
    }

    return this._insertOne({ ...selector, ...doc, ...insertDoc })
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
    ...options
  } = {}) {
    const allRows = await this._find(selector, { ...options, sort: { updatedAt: -1 } })

    query = query.replace(/[\W_]+/g, '')    // remove non-alphanumeric characters

    return allRows.filter(r => {
      const reg = new RegExp(query, 'i')
      return path.find(k => reg.test(r[k]))
    })
  },

  async searchGeo({ lng, lat }, { selector, ...options } = {}) {
    return this._find(selector, options)
  },

  async joinOne(id, name, {
    project,
    projectJoin,
    sort = { updatedAt: -1, _id: 1 },
  } = {}) {
    const coll = this.db(name)

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
    limit = this.config.listLimit,
    skip = 0
  } = {}) {
    const coll = this.db(name)

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this._findOne(id, project),
      coll.find(selector, { project: projectJoin, sort, limit, skip })
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
    
    let parents = await this._find(selector, { project, sort, limit, skip })
    const $in = parents.map(p => p.id)

    selectorJoin = { ...selectorJoin, [fk]: { $in } }

    const coll = this.db(name)

    const children = await coll.find(selectorJoin, { project: projectJoin, sort: sortJoin, limit: limitJoin }) 
    
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
    stages: specs = [],
    project,
    sort = { updatedAt: -1, _id: 1 },
    limit = this.config.listLimit,
    skip = 0
  } = {}) {
    const docs = await createAggregateStages(specs, { db: this.db(), collectionName: this._name, selector, sort }) // mock fully converts stage specs into docs themselves (non-paginated)
    const page = await this._find(undefined, { project, sort, limit, skip, docs }) // apply pagination and sorting on passed in models

    return { count: docs.length, [this._namePlural]: page }
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
      doc.id ??= objectId()
      doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

      this.docs[doc.id] = this._create(doc)
    }

    return { acknowledged: true }
  },

  async updateMany(selector, doc) {
    const models = await this._find(selector)
    models.forEach(m => m.save(doc))
    return { acknowledged: true }
  },

  async deleteMany(selector) {
    const models = await this._find(selector)
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
    const id = doc?.id || objectId()
    return new this.Class({ ...doc, id, __type: this._name })
  },

  make(doc) {
    return new this.Class({ ...doc, __type: this._name })
  },

  insertSeed(docsObject = {}) {
    if (!isServer && window.opener) {
      return this.docs = window.opener.store.replays.seed[this._name] // child window shares db/seed with parent
    }

    this.docs = docsObject

    const docs = Object.values(docsObject)
    const now = new Date().getTime() - (docs.length * 1000) // set clock back in time

    docs.forEach((doc, i) => {
      doc.createdAt ??= new Date(now - (i * 1000)) // put first docs in seed at top of lists (when sorted by updatedAt: -1)
      doc.updatedAt ??= doc.createdAt
      
      const model = this._create(doc)
      this.docs[model.id] = model
    })

    return this.docs
  },


  // stable duplicates (allows overriding non-underscored versions in userland without breaking other methods that use them)

  async _findOne(selector, { project, sort = { updatedAt: -1 } } = {}) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')
    if (typeof selector === 'string') return this._pick(this.docs[selector], project)
    if (selector.id) return this._pick(this.docs[selector.id], project)
  
    const models = await this._find(selector, { project, sort, limit: 1 })
    return models[0]
  },
  
  async _find(selector, {
    project,
    sort = { updatedAt: -1 },
    limit = this.config.listLimit,
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
    doc.id ??= objectId() // if id present, client generated client side optimistically
    doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date
  
    this.docs[doc.id] = this._create(doc)
    return this._pick(this.docs[doc.id], project)
  },
  
  async _updateOne(selector, newDoc, { project } = {}) {
    if (!selector) throw new Error('respond: undefined or null selector passed to updateOne(selector)')
  
    const id = typeof selector === 'string' ? selector : selector.id
    const { id: _, ...doc } = newDoc || selector    // updateOne accepts this signature: updateOne(doc)
  
    const model = await this._findOne(id || selector)
  
    if (model) {
      Object.defineProperties(model, Object.getOwnPropertyDescriptors(doc)) // todo: make deep merge (maybe)
      model.updatedAt = new Date
      this.docs[model.id] = model
    }
  
    return this._pick(model, project)
  },

  _create(doc) {
    const id = doc?.id || objectId()
    return new this.Class({ ...doc, id, __type: this._name })
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

  ...safeMethods
}
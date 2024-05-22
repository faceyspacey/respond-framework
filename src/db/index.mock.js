import objectId from '../utils/objectIdDevelopment.js'
import applySelector from './utils/applySelector.js'
import sortDocs from './utils/sortDocs.js'
import pick from './utils/pick.js'
import safeMethods from './safeMethods.js'
import createAggregateStages from './aggregates/createAggregateStages.mock.js'
import { isServer } from '../utils/bools.js'


export default {
  async findOne(selector, project, sort = { updatedAt: -1 }) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')
    if (typeof selector === 'string') return this._pick(this.docs[selector], project)
    if (selector.id) return this._pick(this.docs[selector.id], project)

    const models = await this.find(selector, project, sort, 1)
    return models[0]
  },

  async find(selector, project, sort = { updatedAt: -1 }, limit = this.config.listLimit, skip = 0, docs = Object.values(this.docs || {})) {
    const start = skip * limit
    const end = start + limit

    docs = sortDocs(docs.filter(applySelector(selector)), sort)
    docs = limit === 0 ? docs.slice(start) : docs.slice(start, end)
    
    return docs.map(doc => this._pick(doc, project))
  },

  async insertOne(doc, proj) {
    doc.id ??= objectId() // if id present, client generated client side optimistically
    doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

    this.docs[doc.id] = this.create(doc)
    return this._pick(this.docs[doc.id], proj)
  },

  async updateOne(selector, newDoc, proj) {
    if (!selector) throw new Error('respond: undefined or null selector passed to updateOne(selector)')

    const id = typeof selector === 'string' ? selector : selector.id
    const { id: _, ...doc } = newDoc || selector    // updateOne accepts this signature: updateOne(doc)

    const model = await this.findOne(id || selector)

    if (model) {
      Object.assign(model, doc) // todo: make deep merge (maybe)
      model.updatedAt = new Date
      this.docs[model.id] = model
    }

    return this._pick(model, proj)
  },

  async upsert(selector, doc, insertOnlyDoc, project) {
    const existingDoc = await this.findOne(selector)

    if (existingDoc) {
      doc.updatedAt = new Date

      Object.assign(existingDoc, doc)
      this.docs[existingDoc.id] = existingDoc
      
      return this.findOne(selector, project)
    }

    return this.insertOne({ ...selector, ...doc, ...insertOnlyDoc })
  },

  async findAll(selector, project, sort) {
    return this.find(selector, project, sort, 0)
  },

  async findLike(key, term, ...args) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return this.find({ [key]: value }, ...args)
  },

  async search(query, project, path = ['firstName', 'lastName'], limit = 50, skip = 0) {
    const allRows = await this.find(undefined, project, { updatedAt: -1 }, limit, skip)

    query = query.replace(/[\W_]+/g, '')    // remove non-alphanumeric characters

    return allRows.filter(r => {
      const reg = new RegExp(query, 'i')
      return path.find(k => reg.test(r[k]))
    })
  },

  async searchGeo({ lng, lat }, selector, project, limit = this.config.listLimit, skip) {
    return this.find(selector, project, { updatedAt: -1 }, limit, skip)
  },

  async joinOne(id, name, proj, projectJoin, sort = { updatedAt: -1, _id: 1 }, limit = this.config.listLimit, skip = 0) {
    const coll = this.db(name)

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this.findOne(id, proj),
      coll.findOne(selector, projectJoin, sort, limit, skip)
    ])

    return { [parentName]: parent, [name]: children }
  },

  async joinMany(id, name, proj, projectJoin, sort = { updatedAt: -1, _id: 1 }, limit = this.config.listLimit, skip = 0) {
    const coll = this.db(name)

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this.findOne(id, proj),
      coll.find(selector, projectJoin, sort, limit, skip)
    ])

    return { [parentName]: parent, [coll._namePlural]: children }
  },

  async join(name, selector, fk, selectorJoin, proj, projectJoin, sort, limit = this.config.listLimit, skip = 0, sortJoin, limitJoin = this.config.listLimit, innerJoin) {
    sort ??= { updatedAt: -1, id: -1 }
    sortJoin ??= { updatedAt: -1, id: -1 }

    fk ??= this._name + 'Id'
    
    let parents = await this.find(selector, proj, sort, limit, skip)
    const $in = parents.map(p => p.id)

    selectorJoin = { ...selectorJoin, [fk]: { $in } }

    const coll = this.db(name)

    const children = await coll.find(selectorJoin, projectJoin, sortJoin, limitJoin) 
    
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

  async aggregate(options = {}) {
    const {
      selector,
      stages: specs = [],
      proj,
      sort = { updatedAt: -1, _id: 1 },
      limit = this.config.listLimit,
      skip = 0
    } = options

    const docs = await createAggregateStages(this.db(), this._name, specs, selector, sort) // mock fully converts stage specs into docs themselves (non-paginated)
    const page = await this.find(undefined, proj, sort, limit, skip, docs) // apply pagination and sorting on passed in models

    return { count: docs.length, [this._namePlural]: page }
  },

  async count(selector) {
    return Object.values(this.docs)
      .filter(applySelector(selector))
      .length
  },

  async totalPages(selector, limit = 10) {
    const count = await this.count(selector)
    return Math.ceil(count / limit)
  },

  async insertMany(docs) {
    for (const doc of docs) {
      doc.id ??= objectId()
      doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

      this.docs[doc.id] = this.create(doc)
    }

    return { acknowledged: true }
  },

  async updateMany(selector, doc) {
    const models = await this.find(selector)
    models.forEach(m => m.save(doc))
    return { acknowledged: true }
  },

  async deleteMany(selector) {
    const models = await this.find(selector)
    models.forEach(m => delete this.docs[m.id])
    return { acknowledged: true }
  },

  async deleteOne(selector) {
    let id = typeof selector === 'string'
      ? selector
      : selector.id
    
    if (!id) {
      const model = await this.findOne(selector)
      id = model?.id
    }

    delete this.docs[id]

    return { acknowledged: true }
  },

  async incrementOne(selector, $inc) {
    const model = await this.findOne(selector)

    const doc = {}

    Object.keys($inc).forEach(k => {
      const v = model[k] || 0 // todo: support nested fields
      doc[k] = v + $inc[k]
    })
    
    await this.updateOne(selector, doc)

    return { acknowledged: true }
  },

  create(doc) {
    const id = doc?.id || objectId()
    const instance = { ...doc, id }
    return Object.defineProperties(instance, this.model())
  },

  insertSeed(docsObject) {
    if (!isServer && window.opener) {
      return this.docs = window.opener.store.replays.seed[this._name] // child window shares db/seed with parent
    }

    this.docs = docsObject

    const docs = Object.values(docsObject)
    const now = new Date().getTime() - (docs.length * 1000) // set clock back in time

    docs.forEach((doc, i) => {
      doc.createdAt ??= new Date(now - (i * 1000)) // put first docs in seed at top of lists (when sorted by updatedAt: -1)
      doc.updatedAt ??= doc.createdAt
      
      const model = this.create(doc)
      this.docs[model.id] = model
    })

    return this.docs
  },


  // utils

  _pick(doc, project) {
    const picked = pick(doc, project)
    return picked ? this.create(picked) : undefined
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
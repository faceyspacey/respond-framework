import objectId from '../utils/objectIdDevelopment.js'
import safeMethods from './safeMethods.js'
import applySelector from './utils/applySelector.js'
import createAggregateStages from './aggregates/createAggregateStages.mock.js'
import { pickAndCreate } from './utils/pick.js'
import { isServer } from '../utils/bools.js'


export default {
  async findOne(selector, project, sort = { updatedAt: -1 }) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')
    if (typeof selector === 'string') return pickAndCreate(this, this.docs[selector], project)
    if (selector.id) return pickAndCreate(this, this.docs[selector.id], project)

    const models = await this._find(selector, project, sort, 1)
    return models[0]
  },

  async find(selector, project, sort = { updatedAt: -1 }, limit = this.config.listLimit, skip = 0, models = Object.values(this.docs || {})) {
    const start = skip * limit
    const end = start + limit

    let docs = models.filter(applySelector(selector))

    const [key, key2] = Object.keys(sort)
    const direction = sort[key]
    
    const asc = (a, b) => 
      (+(a[key] > b[key] || b[key] === undefined) || +(a[key] === b[key]) - 1) ||
        (+(a[key2] > b[key2] || b[key2] === undefined) || +(a[key2] === b[key2]) - 1)

    const desc = (a, b) => 
      (+(b[key] > a[key] || a[key] === undefined) || +(b[key] === a[key]) - 1) ||
        (+(b[key2] > a[key2] || a[key2] === undefined) || +(b[key2] === a[key2]) - 1)

    docs = direction === -1 ? docs.sort(desc) : docs.sort(asc)

    return limit === 0
      ? docs.slice(start).map(doc => pickAndCreate(this, doc, project))
      : docs.slice(start, end).map(doc => pickAndCreate(this, doc, project))
  },

  async insertOne(doc, proj) {
    doc.id ??= objectId() // if id present, client generated client side optimistically
    doc.createdAt = doc.updatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date

    this.docs[doc.id] = this.create(doc)
    return pickAndCreate(this, this.docs[doc.id], proj)
  },

  async updateOne(selector, newDoc, proj) {
    if (!selector) throw new Error('respond: undefined or null selector passed to updateOne(selector)')

    const id = typeof selector === 'string' ? selector : selector.id
    const { id: _, ...doc } = newDoc || selector    // updateOne accepts this signature: updateOne(doc)

    const model = await this._findOne(id || selector)

    if (model) {
      Object.assign(model, doc) // todo: make deep merge (maybe)
      model.updatedAt = new Date
      this.docs[model.id] = model
    }

    return pickAndCreate(this, model, proj)
  },

  async upsert(selector, doc, insertOnlyDoc, project) {
    const existingDoc = await this._findOne(selector)

    if (existingDoc) {
      doc.updatedAt = new Date

      Object.assign(existingDoc, doc)
      this.docs[existingDoc.id] = existingDoc
      
      return this._findOne(selector, project)
    }

    return this._insertOne({ ...selector, ...doc, ...insertOnlyDoc })
  },

  async findAll(selector, project, sort) {
    return this._find(selector, project, sort, 0)
  },

  async findLike(key, term, ...args) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return this._find({ [key]: value }, ...args)
  },

  async search(query, project, path = ['firstName', 'lastName'], limit = 50, skip = 0) {
    const allRows = await this._find(undefined, project, { updatedAt: -1 }, limit, skip)

    query = query.replace(/[\W_]+/g, '')    // remove non-alphanumeric characters

    return allRows.filter(r => {
      const reg = new RegExp(query, 'i')
      return path.find(k => reg.test(r[k]))
    })
  },

  async searchGeo({ lng, lat }, selector, project, limit = this.config.listLimit, skip) {
    return this._find(selector, project, { updatedAt: -1 }, limit, skip)
  },

  async joinOne(id, name, proj, projectJoin, sort = { updatedAt: -1, _id: 1 }, limit = this.config.listLimit, skip = 0) {
    const collection = this.getDb()[name]

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this._findOne(id, proj),
      collection.findOne(selector, projectJoin, sort, limit, skip)
    ])

    return { [parentName]: parent, [name]: children }
  },

  async joinMany(id, name, proj, projectJoin, sort = { updatedAt: -1, _id: 1 }, limit = this.config.listLimit, skip = 0) {
    const collection = this.getDb()[name]

    const parentName = this._name
    const fk = parentName + 'Id'

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this._findOne(id, proj),
      collection._find(selector, projectJoin, sort, limit, skip)
    ])

    return { [parentName]: parent, [collection._namePlural]: children }
  },

  async join(name, selector, fk, selectorJoin, proj, projectJoin, sort, limit = this.config.listLimit, skip = 0, sortJoin, limitJoin = this.config.listLimit, innerJoin) {
    sort ??= { updatedAt: -1, id: -1 }
    sortJoin ??= { updatedAt: -1, id: -1 }

    fk ??= this._name + 'Id'
    
    let parents = await this._find(selector, proj, sort, limit, skip)
    const $in = parents.map(p => p.id)

    selectorJoin = { ...selectorJoin, [fk]: { $in } }

    const collection = this.getDb()[name]

    const children = await collection._find(selectorJoin, projectJoin, sortJoin, limitJoin) 
    
    const outer = this._namePlural
    const inner = collection._namePlural

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

    const docs = await createAggregateStages(this.getDb(), this._name, specs, selector, sort) // mock fully converts stage specs into docs themselves (non-paginated)
    const page = await this._find(undefined, proj, sort, limit, skip, docs) // apply pagination and sorting on passed in models

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

    Object.keys($inc).forEach(k => {
      model[k] = model[k] || 0 // todo: support nested fields
      model[k] += $inc[k]
    })
    
    await this.getModel()._save.call(model)

    return { acknowledged: true }
  },

  create(doc) {
    const id = doc?.id || objectId()
    const instance = { ...doc, id }

    const descriptors = Object.getOwnPropertyDescriptors(this.getModel())

    return Object.defineProperties(instance, descriptors)
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


  // production methods for resolving id -> _id

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
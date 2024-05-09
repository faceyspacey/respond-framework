import objectId from '../utils/objectIdDevelopment.js'
import applySelector from './utils/applySelector.js'
import { pickAndCreate } from './utils/pick.js'


export default {  
  create(doc) {
    const instance = { 
      ...doc,
      id: doc?.id || objectId()
    }

    const descriptors = Object.getOwnPropertyDescriptors(this.getModel())
    return Object.defineProperties(instance, descriptors)
  },


  // seed utilities

  insertSeed(docs) {
    // make it so child window shares db/seed with parent (via mutable docs reference)

    const isChildWindow = typeof window !== 'undefined' && window.opener

    if (isChildWindow) {
      const parentDocs = window.opener.store.replays.seed[this.collectionName]
      this.docs = parentDocs
      return this.docs
    }


    this.docs = docs


    // start regular code

    const values = Object.values(docs)
    const now = new Date().getTime() - (values.length * 1000)

    values.forEach((doc, i) => {
      const seconds = i
      const ms = seconds * 1000

      doc.createdAt = doc.createdAt || new Date(now - ms) // put first docs in seed at top of lists (when sorted by updatedAt: -1)

      this.insertOne(doc)
    })

    return this.docs
  },
  
  
  // insert

  async insertOne(doc, proj) {
    const id = doc.id || objectId() // if id present, client generated id via objectId() client side optimistically (NOTE: we never ended up using this capability, but we should still consider it in case we ever do decide to use it)

    doc.id = id
    doc.createdAt = doc.updatedAt = doc.createdAt
      ? new Date(doc.createdAt)
      : new Date

    this.docs[id] = this.create(doc)
    
    return pickAndCreate(this, this.docs[id], proj)
  },


  // update

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


  async incrementOne(selector, $inc) {
    const model = await this._findOne(selector)

    Object.keys($inc).forEach(k => {
      model[k] = model[k] || 0 // todo: support nested fields
      model[k] += $inc[k]
    })
    
    await this.getModel()._save.call(model)
  },


  // update multi

  async updateMany(selector, doc) {
    const models = await this._find(selector)
    models.forEach(m => m.save(doc))
  },


  // delete

  async removeOne(selector) {
    let id = typeof selector === 'string'
      ? selector
      : selector.id
    
    if (!id) {
      const model = await this._findOne(selector)
      id = model?.id
    }

    delete this.docs[id]
  },

  async deleteMany(selector) {
    const models = await this._find(selector)
    models.forEach(m => delete this.docs[m.id])
  },


  // upsert

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


  // find single
  
  async findOne(selector, project, sort = { updatedAt: -1 }) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')
    if (typeof selector === 'string') return pickAndCreate(this, this.docs[selector], project)
    if (selector.id) return pickAndCreate(this, this.docs[selector.id], project)

    const models = await this._find(selector, project, sort, 1)
    return models[0]
  },


  // find multi

  async _find(selector, project, sort = { updatedAt: -1 }, limit = this.config.listLimit, skip = 0, models = Object.values(this.docs || {})) {
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

    return docs.slice(start, end).map(doc => pickAndCreate(this, doc, project))
  },

  async find(...args) {
    return this._find(...args) // find is overriden by User model to have profileComplete: true, but internally, we need to guarantee a regular find via this._find
  },

  async findAll(selector, project, sort) {
    return this._find(selector, project, sort, 1000000000)
  },

  // search text

  async search(query, project, path = ['firstName', 'lastName'], limit = 50, skip = 0) {
    const allRows = await this._find(null, project, { updatedAt: -1 }, limit, skip)

    query = query.replace(/[\W_]+/g, '')    // remove non-alphanumeric characters

    return allRows.filter(r => {
      const reg = new RegExp(query, 'i')
      return path.find(k => reg.test(r[k]))
    })
  },


  // search geo

  async searchGeo({ lng, lat }, selector, project, skip, limit = this.config.listLimit) {
    return this._find(selector, project, { updatedAt: -1 }, limit, skip)
  },


  // pagination

  async count(selector) {
    return Object.values(this.docs)
      .filter(applySelector(selector))
      .length
  },

  async totalPages(selector, limit = 10) {
    const count = await this.count(selector)
    return Math.ceil(count / limit)
  },

  async joinOne(id, name, $project, $projectJoin, $sort = { updatedAt: -1, _id: 1 }, $limit = this.config.listLimit, $skip = 0) {
    const oneToOne = !name.endsWith('s')
    const method = oneToOne ? 'findOne' : 'find'

    const nameSingular = oneToOne ? name : name.slice(0, -1)
    const collection = this.getDb()[nameSingular]

    const parentName = this.collectionName
    const fk = parentName + 'Id'

    const selector = { [fk]: id  }

    const [parent, children] = await Promise.all([
      this._findOne(id, $project),
      collection[method](selector, $projectJoin, $sort, $limit, $skip) // eg: db.user.find() or db.course.findOne()
    ])

    return { [parentName]: parent, [name]: children }
  },


  async join(selector, inner, fk, selectorJoin, $project, $projectJoin, $sort = { updatedAt: -1, id: -1 }, $limit = this.config.listLimit, $skip = 0) {
    const outer = this.collectionNamePlural
    fk = fk || this.collectionName + 'Id'

    const parents = await this._find(selector, $project, $sort, $limit, $skip)
    const $in = parents.map(p => p.id)

    selectorJoin = { ...selectorJoin, [fk]: { $in } }

    const name = inner.slice(0, -1)
    const children = await this.getDb()[name].find(selectorJoin, $projectJoin, $sort, 1000) 
    
    return {
      [outer]: parents,
      [inner]: children,
    }
  },


  async agg(selector, stages, $project, $sort = { updatedAt: -1, _id: 1 }, $limit = this.config.listLimit, $skip = 0) {
    const allModels = await this._findAll() // find all, as we'll refilter all models in _createCountStatsAndFilter after we have the stat columns, which may also be filtered by
    
    // joined $sum counts ("stats")
    const modelsFiltered = await this._createCountStatsAndFilter(allModels, stages, selector)
    const count = modelsFiltered.length
    
    const models = await this._find(undefined, $project, $sort, $limit, $skip, modelsFiltered) // apply pagination and sorting on stat filtered models

    return { count, [this.collectionNamePlural]: models }
  },


  async aggAll(selector, stages, $project) {
    return this.agg(selector, stages, $project, undefined, 1000000000)
  },

  async aggregateStages(selector, $project, $sort, $limit = this.config.listLimit, $skip = 0, countOnly = false) {
    const allModels = await this._findAll() // find all, as we'll refilter all models in _createCountStatsAndFilter after we have the stat columns, which may also be filtered by

    const stages = this.createAggregateStages(selector)

    // mock geo search by simply not using it
    if (selector.location || selector.lastLocation) {
      delete selector.location
      delete selector.lastLocation

      if ($sort) {
        const sortKey = Object.keys($sort)[0]
        const reversedSortValue = -$sort[sortKey]

        $sort[sortKey] = reversedSortValue // reverse results to show something happened
      }
    }

    // joined $sum counts ("stats")
    const modelsPreFiltered = await this._filterByNonEmptyJoin(allModels, selector)
    const modelsFiltered = await this._createCountStatsAndFilter(modelsPreFiltered, stages, selector)

    const count = modelsFiltered.length

    if (countOnly) return count
    
    const models = await this._find(undefined, $project, $sort, $limit, $skip, modelsFiltered) // apply pagination and sorting on stat filtered models
    
    return { models, count }
  },



  async _filterByNonEmptyJoin(models, selector) {
    const joinFilters = this.createJoinFilter(selector)

    for (const jf of joinFilters) {
      for (const m of models) {
        const { from, foreignField, localField, selector } = jf
        const singular = from.slice(0, -1)
        const count = await this.getDb()[singular].count({ ...selector, [foreignField]: m[localField] })

        if (!count) {
          m._markedForRemoval = true
        }
      }
    }

    return models.filter(m => !m._markedForRemoval)
  },



  async _createCountStatsAndFilter(models, stages, selector) {
    for (const m of models) {
      for (const s of stages) {
        const collection = s.from.slice(0, -1)
        const localField = s.localField === '_id' ? 'id' : s.localField
        const $match = this._createStatsDateRangeMatch(selector, s.$match) // stats range match

        const selectorJoin = { ...$match, [s.foreignField]: m[localField] }

        if (s.$sum === 1) { // standard count aggregate
          m[s.name] = await this.getDb()[collection].count(selectorJoin)
        }
        else { // we also support summing a given field in the joined models, which is the only advanced agg production uses (so we cover 100% of production cases currently - 4/3/2023)
          const joinedModels = await this.getDb()[collection].find(selectorJoin)

          m[s.name] = joinedModels.reduce((sum, jm) => {
            const amount = jm[s.foreignField] || 0
            return amount + sum
          }, 0) // true sumation, not count
        }
      }
    }

    delete selector.startDate // remove these so parent selector doesn't try to use them (they are only for filtering sums)
    delete selector.endDate

    return models.filter(applySelector(selector)) // now apply selectors on joined $sum columns (the only thing missing from the production version now is producing counts based on the startDate/endDate range, which wont mean anything during development when all dates are nowish)
  },


  _createStatsDateRangeMatch(selector = {}, $match) {
    if (selector.startDate && selector.endDate) {
      const $and = $match?.$and || []
  
      $and.push({ createdAt: { $gte: selector.startDate } })
      $and.push({ createdAt: { $lt: selector.endDate } })
  
      $match = { ...$match, $and }
    }
    else if (selector.startDate) {
      $match = { ...$match, createdAt: { $gte: selector.startDate } }
    }
    else if (selector.endDate) {
      $match = { ...$match, createdAt: { $lt: selector.endDate } }
    }

    return $match
  },



  createAggregateStages(selector) {
    return [] // template pattern: delegate to child classes
  },

  createJoinFilter() {
    return []
  },
}
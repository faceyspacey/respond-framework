import { MongoClient, ObjectId } from 'mongodb'
import mock from './index.mock.js'
import createJoin from './utils/createJoin.js'
import { toObjectIds, toObjectIdsSelector, fromObjectIds } from './utils/toFromObjectIds.js'
import pick from './utils/pick.js'
import isProd from '../utils/isProd.js'
import excludeProjectFields from './utils/excludeProjectFields.js'


export default !isProd ? mock : {  
  create(doc) {
    const instance = { ...this._fromObjectIds(doc) }              // mongo ObjectId objects converted to strings for ez client consumption
    instance.id ??= instance._id || new ObjectId().toString()     // _id switched to id for standardized consumption (but can also be supplied in doc as `id`, eg optimistically client-side using bson library)
    delete instance._id                                           // bye bye _id
    
    const descriptors = Object.getOwnPropertyDescriptors(this.getModel())
    return Object.defineProperties(instance, descriptors)
  },

  

  // collection getters 

  get collection() {
    if (this._mongoCollection) return this._mongoCollection

    const client = new MongoClient(this.config.connectionString)
    const db = client.db('skins')

    return this._mongoCollection = db.collection(this.collectionName)
  },



  // seed utilities

  async insertSeed(docs) {
    // await this.deleteMany({})
    // await this.insertMany(Object.values(docs))
  },

  async deleteMany(selector) {
    await this.collection.deleteMany(selector)
  },
  
  // insert

  async insertOne({ id, ...doc }, proj) {
    doc._id = new ObjectId(id)
    doc.createdAt = doc.updatedAt = new Date(doc.createdAt || new Date)

    doc = this._toObjectIds(doc)
    await this.collection.insertOne(doc)
    return this.create(pick(doc, proj))
  },

  async insertMany(docs) {
    await this.collection.insertMany(docs)
  },


  // update

  async updateOne(selector, newDoc, proj) {
    if (!selector) throw new Error('respond: undefined or null selector passed to updateOne(selector)')

    const { id, createdAt: _, updatedAt: __, lastRoundAt: ___, finishedAt: ____, ...doc } = newDoc || selector    // accept signature: updateOne(doc)

    selector = this._toObjectIdsSelector(id ? { id } : selector)


    const result = await this.collection.findOneAndUpdate(selector, {
      $set: this._toObjectIds(doc),
      $currentDate: { updatedAt: true }
    }, { projection: this._toProject(proj), returnDocument: 'after' })


    if (!result.value) return

    const model = result.value

    return this.create(model)
  },


  async incrementOne(selector, $inc) {
    selector = this._toObjectIdsSelector(selector)

    delete selector.createdAt
    delete selector.updatedAt
    delete selector.lastRoundAt
    delete selector.finishedAt

    await this.collection.updateOne(selector, { $inc })
  },


  // update multi

  async updateMany(selector, $set) {
    try {
      await this.collection.updateMany(this._toObjectIdsSelector(selector), { $set: this._toObjectIds($set) })
    }
    catch(error) {
      console.error(`${this.collectionName}.updateMany Error`, error) // allow calling code to swallow
    }
  },


  // delete

  async removeOne(selector) {
    selector = this._toObjectIdsSelector(selector)
    await this.collection.deleteOne(selector)
  },

  async deleteMany(selector) {
    selector = this._toObjectIdsSelector(selector)
    await this.collection.deleteMany(selector)
  },


  // upsert

  async upsert(selector, doc, insertOnlyDoc, proj) {
    const result = await this.collection.findOneAndUpdate(this._toObjectIdsSelector(selector), {
      $set: this._toObjectIds(doc),
      $setOnInsert: this._toObjectIdsSelector({ ...selector, ...insertOnlyDoc, createdAt: new Date }),
      $currentDate: { updatedAt: true }
    }, { upsert: true, projection: this._toProject(proj), returnDocument: 'after' })

    if (!result.value) return

    const model = result.value

    return this.create(model)
  },

  

  // find single
  
  async findOne(selector, proj, sort = { updatedAt: -1 }) {
    if (!selector) throw new Error('You are passing undefined to Model.findOne()!')

    selector = this._toObjectIdsSelector(selector)

    const model = await this.collection.findOne(selector, { projection: this._toProject(proj), sort })

    return model && this.create(model)
  },

  async findOneSafe(selector, proj, sort) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this.findOne(selector, proj, sort)
  },

  // find multi

  async find(selector, proj, sort = { updatedAt: -1, _id: 1 }, limit = this.config.listLimit, skip = 0) {
    selector = this._toObjectIdsSelector(selector)

    const models = await this.collection
      .find(selector)
      .sort(sort)
      .skip(skip * limit)
      .limit(limit)
      .project(this._toProject(proj))
      .toArray()

    return models.map(m => this.create(m))
  },


  async findAll(selector, project, sort) {
    return this.find(selector, project, sort, 1000000000)
  },


  // search geo

  async searchGeo({ lng, lat }, selector, proj, $skip = 0, $limit = this.config.listLimit) {
    console.log('Model.searchGeo', proj)
    const models = await this.collection.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          spherical: true,
          distanceField: 'distance',
          key: 'location'
        }
      },
      ...(selector ? [{ $match: selector }] : []),
      { $skip: $skip * $limit },
      { $limit },
      ...(proj ? [{ $project: this._toProject(proj) }] : []),
    ]).toArray()

    return models.map(m => this.create(m))
  },



  // search text

  async search(query, proj, path = ['firstName', 'lastName'], limit = 50, skip = 0) {
    if (this.config.useLocalDb) {
      return this.find({ $text: { $search: query } }, this._toProject(proj), undefined, limit, skip)
    }

    const models = await this.collection.aggregate([
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
      { $skip: skip * limit },
      { $limit: limit },
      ...(proj ? [{ $project: this._toProject(proj) }] : []),
    ]).toArray()

    return models.map(m => this.create(m))
  },


  // pagination

  async count(selector) {
    return this.collection.count(this._toObjectIdsSelector(selector))
  },

  async totalPages(selector, limit = 10) {
    const count = await this.count(this._toObjectIdsSelector(selector))
    return Math.ceil(count / limit)
  },


  async joinOne(id, name, proj, projJoin, $sort = { updatedAt: -1, _id: 1 }, $limit = this.config.listLimit, $skip = 0) {
    const oneToOne = !name.endsWith('s')
    const method = oneToOne ? 'findOne' : 'find'

    const nameSingular = oneToOne ? name : name.slice(0, -1)
    const collection = db[nameSingular]

    const parentName = this.collectionName
    const fk = parentName + 'Id'

    const selector = collection._toObjectIdsSelector({ [fk]: id  }) 

    const project = this._toProject(proj)
    const projectJoin = collection._toProject(projJoin)

    let [parent, children] = await Promise.all([
      this.findOne(id, project),
      collection[method](selector, projectJoin, $sort, $limit, $skip),
    ])

    return { [parentName]: parent, [name]: children }
  },


  async join(selector, inner, fk, selectorJoin, proj, projJoin, $sort, $limit = this.config.listLimit, $skip = 0, $sortJoin, $limitJoin) {
    const outer = this.collectionNamePlural

    $sort = $sort || { updatedAt: -1, id: -1 }
    fk = fk || this.collectionName + 'Id'

    const localField = this._getIdName() // _id || id for CourseModel

    const nameSingular = inner.slice(0, -1)
    const collection = db[nameSingular]

    proj = this._toProject(proj)
    selector = this._toObjectIdsSelector(selector)

    projJoin = collection._toProject(projJoin)
    selectorJoin = collection._toObjectIdsSelector(selectorJoin) // joined collection could be CourseModel, in which case we need to use its _toObjectIdsSelector method

    $sort = this._toObjectIdsSelector($sort) // id: -1 needs to be converted to _id: -1 if a regular model, and remain the same if a CourseModel
    $sortJoin = collection._toObjectIdsSelector($sortJoin)

    let stages = createJoin(outer, inner, fk, localField, proj, projJoin, selectorJoin, $sortJoin, $limitJoin)

    stages = [
      ...(selector ? [{ $match: selector }] : []),
      { $sort },
      { $skip: $skip * $limit },
      { $limit },
      ...stages
    ]

    const countPromise = this.collection.count(selector)
    const docsPromise = this.collection.aggregate(stages).next() // result of createJoin is first element in array

    let [count, results] = await Promise.all([countPromise, docsPromise])

    return {
      count,
      [outer]: results[outer].map(m => this.create(m)),
      [inner]: results[inner].map(m => collection.create(m)), // must use joined collection's create method
    }
  },


  async agg(selector, stages, proj, $sort = { updatedAt: -1, _id: 1 }, $limit = this.config.listLimit, $skip = 0) {
    selector = this._toObjectIdsSelector(selector)

    stages = [
      ...(selector ? [{ $match: selector }] : []),
      ...stages
    ]

    const countPromise = this.collection.count(selector)
    
    const docsPromise = this.collection.aggregate([
        ...stages,
      { $sort },
      ...($skip ? [{ $skip: $skip * $limit }] : []),
      { $limit },
      ...(proj ? [{ $project: this._toProject(proj) }] : []),
    ]).toArray()

    
    let [count, models] = await Promise.all([countPromise, docsPromise])
    models = models.map(m => this.create(m))

    return { count, [this.collectionNamePlural]: models }
  },


  async aggAll(selector, stages, $project) {
    return this.agg(selector, stages, $project, undefined, 1000000000)
  },


  async aggregateStages(selector, proj, $sort = { updatedAt: -1, _id: 1 }, $limit = this.config.listLimit, $skip = 0, countOnly = false) {
    selector = this._toObjectIdsSelector(selector)

    // main selector + agg $sum stages + selectors on $sum stages

    const stages = [
      { $match: selector },
      ...this.createJoinFilter(selector),
      ...this.createAggregateStages(selector),
    ]
    

    // irregularity: these actually are only intended for createJoinSums in createAggregateStages (called directly above),
    // not for filtering parent models, but client side it was convenient to pass them along like regular parent filters

    delete selector.startDate
    delete selector.endDate


    // standard sort || $geoNear sort

    if (!selector.location && !selector.lastLocation) {
      stages.push({ $sort })
    }
    else {
      const { lng, lat } = selector.location || selector.lastLocation
     
      delete selector.location
      delete selector.lastLocation

      stages.unshift({ // $geoNear can only be 1st stage
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          spherical: true,
          distanceField: 'distance',
          key: 'location'
        }
      }) 
    }

    
    // execute queries

    const countPromise = this.collection.aggregate([...stages, { $count: 'count' }]).toArray()

    const docsPromise = this.collection.aggregate([
        ...stages,
        { $skip: $skip * $limit },
        { $limit },
        ...(proj && { $project: this._toProject(proj) }),
    ]).toArray()

    
    if (countOnly) return (await countPromise)[0]?.count ?? 0 // campaigns uses count only for audienceSize, when it calls this method for each row

    let [count, models] = await Promise.all([countPromise, docsPromise])

    count = count[0]?.count ?? 0

    return { count, models: models.map(m => this.create(m)) }
  },


  createAggregateStages(selector) {
    return [] // template pattern: delegate to child classes
  },
  
  createJoinFilter() {
    return []
  },


  // _id <-> id conversion utils (here as methods so they can be overriden in userland if a different approach is desired)

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
}
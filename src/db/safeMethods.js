import excludeProjectFields from './utils/excludeProjectFields.js'


export default {
  async findOneSafe(selector, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.findOne(selector, { ...opts, project })
  },

  async findManySafe(selector, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.findMany(selector, { ...opts, project })
  },

  async findAllSafe(selector, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.findAll(selector, { ...opts, project })
  },

  async findLikeSafe(key, term, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.findLike(key, term, { ...opts, project })
  },

  async searchSafe(query, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.search(query, { ...opts, project })
  },

  async searchGeoSafe(location, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.searchGeo(location, { ...opts, project })
  },

  async joinOneSafe(id, name, opts) {
    const collection = this.db[name]

    const project = excludeProjectFields(opts?.project, this.privateFields)
    const projectJoin = excludeProjectFields(opts?.projectJoin, collection.privateFields)

    return this.joinOne(id, name, { ...opts, project, projectJoin })
  },

  async joinManySafe(id, name, opts) {
    const collection = this.db[name]
    
    const project = excludeProjectFields(opts?.project, this.privateFields)
    const projectJoin = excludeProjectFields(opts?.projectJoin, collection.privateFields)

    return this.joinMany(id, name, { ...opts, project, projectJoin })
  },

  async joinSafe(name, opts) {
    const collection = this.db[name]
    
    const project = excludeProjectFields(opts?.project, this.privateFields)
    const projectJoin = excludeProjectFields(opts?.projectJoin, collection.privateFields)

    return this.join(name, fk, { ...opts, project, projectJoin })
  },

  async aggregateSafe(opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.aggregate({ ...opts, project })
  },

  async updateOneSafe(selector, newDoc, opts) {
    if (selector?.roles) {
      selector = { ...selector }
      delete selector.roles
    }
  
    if (newDoc?.roles) {
      newDoc = { ...newDoc }
      delete newDoc.roles
    }

    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.updateOne(selector, newDoc, { ...opts, project })
  },

  async insertOneSafe(doc, opts) {
    if (doc?.roles) {
      doc = { ...doc }
      delete doc.roles
    }

    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.insertOne(doc, { ...opts, project })
  },

  async upsertSafe(selector, doc, opts) {
    if (selector?.roles) {
      selector = { ...selector }
      delete selector.roles
    }
  
    if (doc?.roles) {
      doc = { ...doc }
      delete doc.roles
    }

    if (opts?.insertDoc?.roles) {
      opts = { ...opts }
      opts.insertDoc = { ...opts.insertDoc }
      delete opts.insertDoc.roles
    }

    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.upsert(selector, doc, { ...opts, project })
  },

  async saveSafe(model) {
    return this.upsertSafe(model)
  },

  createSafe({ ...doc }) {
    this.privateFields.forEach(k => delete doc[k])
    return this.create(doc)
  },
}
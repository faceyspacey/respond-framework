import excludeProjectFields from './utils/excludeProjectFields.js'


export default {
  async findOneSafe(selector, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.findOne(selector, { ...opts, project })
  },

  async findSafe(selector, opts) {
    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.find(selector, { ...opts, project })
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
    const collection = this.db(name)

    const project = excludeProjectFields(opts?.project, this.privateFields)
    const projectJoin = excludeProjectFields(opts?.projectJoin, collection.privateFields)

    return this.joinOne(id, name, { ...opts, project, projectJoin })
  },

  async joinManySafe(id, name, opts) {
    const collection = this.db(name)
    
    const project = excludeProjectFields(opts?.project, this.privateFields)
    const projectJoin = excludeProjectFields(opts?.projectJoin, collection.privateFields)

    return this.joinMany(id, name, { ...opts, project, projectJoin })
  },

  async joinSafe(name, opts) {
    const collection = this.db(name)
    
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
      delete selector.roles
    }
  
    if (newDoc?.roles) {
      delete newDoc.roles
    }

    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.updateOne(selector, newDoc, { ...opts, project })
  },

  async insertOneSafe(doc, opts) {
    if (doc?.roles) {
      delete doc.roles
    }

    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.insertOne(doc, { ...opts, project })
  },

  async upsertSafe(selector, doc, opts) {
    if (selector?.roles) {
      delete selector.roles
    }
  
    if (doc?.roles) {
      delete doc.roles
    }

    if (opts?.insertDoc?.roles) {
      delete opts.insertDoc.roles
    }

    const project = excludeProjectFields(opts?.project, this.privateFields)
    return this.upsert(selector, doc, { ...opts, project })
  },

  createSafe({ ...doc }) {
    this.privateFields.forEach(k => delete doc[k])
    return this.create(doc)
  },
}
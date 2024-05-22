import excludeProjectFields from './utils/excludeProjectFields.js'


export default {
  async findOneSafe(selector, proj, sort) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this.findOne(selector, proj, sort)
  },

  async findSafe(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this.find(selector, proj, ...args)
  },

  async findAllSafe(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this.findAll(selector, proj, ...args)
  },

  async findLikeSafe(key, term, selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this.findLike(key, term, selector, proj, ...args)
  },

  async searchSafe(query, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this.search(query, proj, ...args)
  },

  async searchGeoSafe(location, selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this.searchGeo(location, selector, proj, ...args)
  },

  async joinOneSafe(id, name, proj, projJoin, ...args) {
    const collection = this.db(name)

    proj = excludeProjectFields(proj, this.privateFields)
    projJoin = excludeProjectFields(projJoin, collection.privateFields)

    return this.joinOne(id, name, proj, projJoin, ...args)
  },

  async joinManySafe(id, name, proj, projJoin, ...args) {
    const collection = this.db(name)
    
    proj = excludeProjectFields(proj, this.privateFields)
    projJoin = excludeProjectFields(projJoin, collection.privateFields)

    return this.joinMany(id, name, proj, projJoin, ...args)
  },

  async joinSafe(selector, name, fk, selectorJoin, proj, projJoin, ...args) {
    const collection = this.db(name)
    
    proj = excludeProjectFields(proj, this.privateFields)
    projJoin = excludeProjectFields(projJoin, collection.privateFields)

    return this.join(selector, name, fk, selectorJoin, proj, projJoin, ...args)
  },

  async aggregateSafe(options) {
    const proj = excludeProjectFields(options.proj, this.privateFields)
    return this.aggregate({ ...options, proj })
  },

  async updateOneSafe(selector, newDoc, proj) {
    if (selector?.roles) {
      delete selector.roles
    }
  
    if (newDoc?.roles) {
      delete newDoc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this.updateOne(selector, newDoc, proj)
  },

  async insertOneSafe(doc, proj) {
    if (doc?.roles) {
      delete doc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this.insertOne(doc, proj)
  },

  async upsertSafe(selector, doc, insertOnlyDoc, proj) {
    if (selector?.roles) {
      delete selector.roles
    }
  
    if (doc?.roles) {
      delete doc.roles
    }

    if (insertOnlyDoc?.roles) {
      delete insertOnlyDoc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this.upsert(selector, doc, insertOnlyDoc, proj)
  },

  createSafe({ ...doc }) {
    this.privateFields.forEach(k => delete doc[k])
    return this.create(doc)
  },
}
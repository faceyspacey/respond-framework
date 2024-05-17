import excludeProjectFields from './utils/excludeProjectFields.js'


export default {
  async findOneSafe(selector, proj, sort) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._findOne(selector, proj, sort)
  },

  async findSafe(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._find(selector, proj, ...args)
  },

  async findAllSafe(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._findAll(selector, proj, ...args)
  },

  async findLikeSafe(key, term, selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._findLike(key, term, selector, proj, ...args)
  },

  async searchSafe(query, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._search(query, proj, ...args)
  },

  async searchGeoSafe(location, selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._searchGeo(location, selector, proj, ...args)
  },

  async joinOneSafe(id, name, proj, projJoin, ...args) {
    const collection = this.getDb()[name]

    proj = excludeProjectFields(proj, this.privateFields)
    projJoin = excludeProjectFields(projJoin, collection.privateFields)

    return this._joinOne(id, name, proj, projJoin, ...args)
  },

  async joinManySafe(id, name, proj, projJoin, ...args) {
    const collection = this.getDb()[name]
    
    proj = excludeProjectFields(proj, this.privateFields)
    projJoin = excludeProjectFields(projJoin, collection.privateFields)

    return this._joinMany(id, name, proj, projJoin, ...args)
  },

  async joinSafe(selector, name, fk, selectorJoin, proj, projJoin, ...args) {
    const collection = this.getDb()[name]
    
    proj = excludeProjectFields(proj, this.privateFields)
    projJoin = excludeProjectFields(projJoin, collection.privateFields)

    return this._join(selector, name, fk, selectorJoin, proj, projJoin, ...args)
  },

  async aggregateSafe(options) {
    const proj = excludeProjectFields(options.proj, this.privateFields)
    return this._aggregate({ ...options, proj })
  },

  async updateOneSafe(selector, newDoc, proj) {
    if (selector?.roles) {
      delete selector.roles
    }
  
    if (newDoc?.roles) {
      delete newDoc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this._updateOne(selector, newDoc, proj)
  },

  async insertOneSafe(doc, proj) {
    if (doc?.roles) {
      delete doc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this._insertOne(doc, proj)
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
    return this._upsert(selector, doc, insertOnlyDoc, proj)
  },

  createSafe({ ...user }) {
    this.privateFields.forEach(k => delete user[k])
    return this.create(user)
  },
}
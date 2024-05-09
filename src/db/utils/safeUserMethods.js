import excludeProjectFields from './excludeProjectFields.js'


export default {
  createSafe({ ...user }) {
    this.privateFields.forEach(k => delete user[k])
    return this.create(user)
  },

  async updateOneSafe(selector, newDoc, proj) {
    if (selector?.roles) { // security -- can't make yourself an admin! -- allows for direct calls from client
      delete selector.roles
    }
  
    if (newDoc?.roles) { // security
      delete newDoc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this.updateOne(selector, newDoc, proj)
  },

  async insertOneSafe(doc, proj) {
    if (doc?.roles) { // security
      delete doc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this.insertOne(doc, proj)
  },

  async upsertSafe(selector, doc, insertOnlyDoc, proj) {
    if (selector?.roles) { // security
      delete selector.roles
    }
  
    if (doc?.roles) { // security
      delete doc.roles
    }

    if (insertOnlyDoc?.roles) { // security
      delete insertOnlyDoc.roles
    }

    proj = excludeProjectFields(proj, this.privateFields)
    return this.upsert(selector, doc, insertOnlyDoc, proj)
  },


  async count(selector, proj, ...args) {
    return this._count({ ...selector, profileComplete: true }, proj, ...args)
  },

  async find(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._find({ ...selector, profileComplete: true }, proj, ...args)
  },

  async findAll(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._findAll({ ...selector, profileComplete: true }, proj, ...args)
  },

  async agg(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._agg({ ...selector, profileComplete: true }, proj, ...args)
  },

  async aggAll(selector, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._aggAll({ ...selector, profileComplete: true }, proj, ...args)
  },

  async aggregateStages(selector, ...args) {
    return this._aggregateStages({ ...selector, profileComplete: true }, ...args)
  },

  async search(query, proj, ...args) {
    proj = excludeProjectFields(proj, this.privateFields)
    const users = await this._search(query, proj, ...args)
    return users.filter(u => u.profileComplete)
  },

  async searchGeo(location, selector, proj, limit, skip) {
    proj = excludeProjectFields(proj, this.privateFields)
    return this._searchGeo(location, { ...selector, profileComplete: true }, proj, limit, skip)
  },
}
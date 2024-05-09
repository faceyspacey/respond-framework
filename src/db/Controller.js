import jwt from '../utils/jwt.js'
import stringToRegex, { isRegexString } from './utils/stringToRegex.js'
import db from '../db.js'


export default  {
  async insertOne(...args) {
    return { 
      [this.name]: await db[this.name].insertOne(...args)
    }
  },

  async updateOne(...args) {
    return { 
      [this.name]: await db[this.name].updateOne(...args)
    }
  },

  async removeOne(...args) {
    return { 
      [this.name]: await db[this.name].removeOne(...args)
    }
  },

  async upsert(...args) {
    return { 
      [this.name]: await db[this.name].upsert(...args)
    }
  },

  async findOne(...args) {
    const { name: name } = this
    const model = await db[name].findOne(...args)

    if (!model) return { error: `model-not-exist`, params: { name }}
    return { [name]: model }
  },

  async find(...args) {
    return { 
      [this.namePlural]: await db[this.name].find(...args)
    }
  },
  
  async search(...args) {
    return { 
      [this.namePlural]: await db[this.name].search(...args)
    }
  },

  async searchGeo(...args) {
    return { 
      [this.namePlural]: await db[this.name].searchGeo(...args)
    }
  },

  async findLike(key, term) {
    term = term.replace(/\\*$/g, '') // backslashes cant exist at end of regex
    const value = new RegExp(`^${term}`, 'i')

    return db[this.name].find({ [key]: value })
  },

  async logout() {
    // todo: during SSR delete the cookie token right here too (production only)
  },

  // helper method available to all controllers

  async findCurrentUser() {
    if (!this.user) return null

    if (this._currUser) return this._currUser // cache for request
    return this._currUser = await db.user.findOne(this.user.id)
  },


  // internal methods

  async callFilteredByRole(context) {
    this.context = context
    
    const { method, token, userId } = context
    const args = context.args.map(a => a === '__undefined__' ? undefined : a) // preserve default parameter values, by undoing JSON.stringify which otherwise would make undefined null
    const controller = this.name

    if (!this[method]) {
      const params = { controller, method }
      return { error: 'missing-controller-method', params }
    }

    this.user = this._verify(token) 

    const isMasquerading = userId && this.user.id !== userId

    if (isMasquerading) {
      if (this.user?.roles.includes('admin')) {
        this.user.id = userId
      }
    }

    if (!this._hasPermission(method, this.user?.roles)) {
      const allowedRoles = this.permissions[method]
      const roles = this.user?.roles ?? []
      const params = { controller, method, roles, allowedRoles }
      return { error: 'not-authenticated', params }
    }

    return this[method](...args) // call eg: controllers/User.updateOne(id)
  },


  _verify(token) {
    if (!token) return
    
    try {
      return jwt.verify(token, this.secret)
    }
    catch (e) {} // throws when invalid, but for us !this.user is our indicator that we aren't dealing with a verified user downstream (i.e. in the actual Controller methods called)
  },
  
  _hasPermission(method, roles = []) {
    const { permissions } = this
    if (!permissions) return true

    const allowedRoles = this.permissions[method]
    if (!allowedRoles) return false
    
    const isPublic = allowedRoles.length === 0

    if (isPublic) return true

    return allowedRoles.find(ar => roles.find(r => r === ar))
  },


  async findByQueryPaginated(query, projection) {
    const { limit, skip, sortKey = 'updatedAt', sortValue = -1, ...sel } = query
    const sort = { [sortKey]: sortValue, _id: sortValue }

    const selector = this._preparePaginatedSelector(sel, this.name) // clear unused params, transform regex strings
    const { models, count } = await db[this.name].aggregateStages(selector, projection, sort, limit, skip)

    return {
      [this.namePlural]: models,
      count,
      query,
    }
  },

  _preparePaginatedSelector({ ...selector }, controllerName) {
    Object.keys(selector).forEach(k => {
      let v = selector[k]
      const paramCleared = v === '' || v === undefined
  
      if (paramCleared) {
        delete selector[k]
        return
      }
  
      if (typeof v === 'string' && !isRegexString(v) && k !== 'id' && !k.endsWith('Id') && !k.endsWith('id')) { // dont convert id selectors to regexes
        v = '/^' + v + '/i'
      }
  
      selector[k] = stringToRegex(v)
    })
  
    return selector
  }
}

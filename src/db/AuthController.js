import jwt from '../utils/jwt.js'
import { argsOut } from './fetch.js'


export default {
  async _callFilteredByRole(body) {
    this.context = body
    
    const { method, token, userId, adminUserId, args } = body
    const controller = this._name

    if (!this[method]) {
      const params = { controller, method }
      return { error: 'missing-controller-method', params }
    }

    this.user = this._verify(token) 

    const isMasquerading = adminUserId &&                   // when adminUserId is present, it means calls are coming from admin panel
      this.user?.roles.includes('admin') &&                 // verify user is in fact admin based on token
      !this.permissions[method]?.includes('admin')          // admin making calls on behalf of user signified by accessing methods that don't have admin role

    if (isMasquerading) {
      this.user = { id: userId, roles: ['user'] }   // replace admin user that came from token with masqueraded user
    }

    if (!this._hasPermission(method, this.user?.roles)) {
      const allowedRoles = this.permissions[method]
      const roles = this.user?.roles ?? []
      const params = { controller, method, roles, allowedRoles }
      return { error: 'not-authenticated', params }
    }

    return this[method](...argsOut(args)) // call eg: controllers/User.updateOne(id)
  },

  _verify(token) {
    if (!token) return
    
    try {
      return jwt.verify(token, this.secret)
    }
    catch {} // throws when invalid, but for us !this.user is our indicator that we aren't dealing with a verified user downstream (i.e. in the actual Controller methods called)
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

  async logout() {
    // todo: during SSR delete the cookie token right here too (production only)
  },
  
  async findCurrentUser(safe = true) {
    if (!this.user) return null

    if (safe) {
      if (this._currUserSafe) return this._currUserSafe // cache for request
      return this._currUserSafe = await this.db.user.findOneSafe(this.user.id)
    }

    if (this._currUser) return this._currUser // cache for request
    return this._currUser = await this.db.user.findOne(this.user.id)
  },
}
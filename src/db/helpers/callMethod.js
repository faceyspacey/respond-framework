
import jwt from '../../helpers/jwt.js'
import { argsOut as out } from '../../helpers/fetch.js'
import secretMock from '../secret.mock.js'


export default async function (req, context = {}) {
  this.req = req
  this.context = context

  const { table, method, args } = req.body
  const perms = this.permissions

  if (!this[method]) return { error: 'method-absent', params: { table, method } }

  this.identity = getIdentity(this.config, req.body, perms)

  if (permitted(perms, method, this.identity)) return this[method](...out(args)) // eg db.user.findOne(id)

  const allowed = perms[method]
  const roles = this.identity?.roles ?? []
  const params = { table, method, roles, allowed }

  return { error: 'denied', params }
}



const getIdentity = (config, body, perms) => {
  const { token, method, userId, adminUserId } = body
  const identity = jwt.verify(token, config.secret ?? secretMock) 

  const mask = isMasquerading(perms, method, identity, adminUserId)
  return mask ? { id: userId, roles: ['user'] } : identity  // replace admin user that came from token with masqueraded user
}



const permitted = (perms, method, identity) => {
  if (!perms) return true

  const allowed = perms[method]
  if (!allowed) return false
  
  const isPublic = allowed.length === 0
  if (isPublic) return true

  if (!identity?.roles) return false
  return allowed.find(ar => identity.roles.find(r => r === ar))
}



const isMasquerading = (perms, method, identity, adminUserId) => {
  if (!adminUserId) return false                         // when adminUserId is present, it means calls are coming from admin panel
  if (!identity?.roles.includes('admin')) return false   // verify user is in fact admin based on token
  if (perms[method]?.includes('admin')) return false     // no need to masquerade when making standard admin calls
  return true
}
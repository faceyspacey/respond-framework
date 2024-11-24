
import jwt from '../../utils/jwt.js'
import { argsOut as out } from '../fetch.js'
import secretMock from '../secret.mock.js'


export default async function call(req, context = {}) {
  this.req = req
  this.context = context

  const { table, method, args } = req.body
  const perms = this.permissions

  if (!this[method]) return { error: 'method-absent', params: { table, method } }

  this.user = getUser(this.config, req.body, perms)

  if (permitted(perms, method, this.user)) return this[method](...out(args)) // eg db.user.findOne(id)

  const allowed = perms[method]
  const roles = this.user?.roles ?? []
  const params = { table, method, roles, allowed }

  return { error: 'denied', params }
}



const getUser = (config, body, perms) => {
  const { token, method, userId, adminUserId } = body
  const user = jwt.verify(token, config.secret ?? secretMock) 

  const mask = isMasquerading(perms, method, user, adminUserId)
  return mask ? { id: userId, roles: ['user'] } : user  // replace admin user that came from token with masqueraded user
}



const permitted = (perms, method, user) => {
  if (!perms) return true

  const allowed = perms[method]
  if (!allowed) return false
  
  const isPublic = allowed.length === 0
  if (isPublic) return true

  if (!user?.roles) return false
  return allowed.find(ar => user.roles.find(r => r === ar))
}



const isMasquerading = (perms, method, user, adminUserId) => {
  if (!adminUserId) return false                     // when adminUserId is present, it means calls are coming from admin panel
  if (!user?.roles.includes('admin')) return false   // verify user is in fact admin based on token
  if (perms[method]?.includes('admin')) return false // no need to masquerade when making standard admin calls
  return true
}

import jwt from '../../helpers/jwt.js'
import secretMock from '../secret.mock.js'


export function makeRequest(req, context = {}) {
  this.req = req
  this.context = context

  const { table, method, args } = req.body
  const perms = this.permissions

  if (!this[method]) return { error: 'method-absent', params: { table, method } }

  this.identity = this.getIdentity(this.config, req.body, perms)

  if (this.permitted(perms, method, this.identity)) return this.callMethod(method, args)

  const allowed = perms[method]
  const roles = this.identity?.roles ?? []
  const params = { table, method, roles, allowed }

  return { error: 'denied', params }
}




export async function callMethod(method, args) {
  if (this.beforeRequest) {
    const ret = await self.beforeRequest(this.req.body)
    if (ret) return ret
  }

  const res = await this[method](...args) // eg db.user.findOne(id)
  
  if (this.afterRequest) {
    const ret = await this.afterRequest(this.req.body, res)
    if (ret) return ret
  }

  return res
}


export function permitted(perms, method, identity) {
  if (!perms) return true

  const allowed = perms[method]
  if (!allowed) return false
  
  const isPublic = allowed.length === 0
  if (isPublic) return true

  if (!identity?.roles) return false
  return allowed.find(ar => identity.roles.find(r => r === ar))
}


export function getIdentity(config, body, perms) {
  const { token, method, userId, adminUserId } = body
  const identity = jwt.verify(token, config.secret ?? secretMock) 

  const mask = isMasquerading(perms, method, identity, adminUserId, userId)
  return mask ? { id: userId, roles: ['user'] } : identity  // replace admin user that came from token with masqueraded user
}


function isMasquerading(perms, method, identity, adminUserId, userId) {
  if (!adminUserId) return false                         // when adminUserId is present, it means calls are coming from admin panel
  if (!userId) return false                              // no userId to masquerade with 
  if (userId === adminUserId) return false               // no need to masquerade when making calls as self
  if (!identity?.roles.includes('admin')) return false   // verify user is in fact admin based on token
  if (perms?.[method]?.includes('admin')) return false   // no need to masquerade when making standard admin calls
  
  return true
}
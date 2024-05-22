import jwt from '../../utils/jwt.js'
import secretMock from '../../db/secret.mock.js'
import { isProd } from '../../utils/bools.js'


export default (settings, seed, options) => {
  if (isProd) return settings.token
  if (!settings.userId) return ''
  
  const id = settings.userId

  const { roles } = seed.user[id]
  const payload = { id, roles }
  
  const secret = options.secret || secretMock

  return jwt.sign(payload, secret, { noTimestamp: true })
}
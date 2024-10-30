import jwt from '../../utils/jwt.js'
import secret from '../../db/secret.mock.js'


export default (settings, seed, options) => {
  if (!settings.userId) return
  
  const id = settings.userId

  const { roles } = seed.user[id]
  const payload = { id, roles }

  return jwt.sign(payload, secret, { noTimestamp: true })
}
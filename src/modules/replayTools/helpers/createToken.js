import jwt from '../../helpers/jwt.js'
import secret from '../../db/secret.mock.js'
import { isProd } from '../../utils.js'


export default respond => {
  if (isProd) return respond.cookies.get('token')
    
  const { settings, db } = respond.replays
  if (!settings.userId) return
  
  const id = settings.userId

  const { roles } = db.user.docs[id]
  const payload = { id, roles }

  return jwt.sign(payload, secret, { noTimestamp: true })
}
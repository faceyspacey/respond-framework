import { isProd } from '../../helpers/constants.js'
import secret from '../../db/secret.mock.js'
import jwt from '../../helpers/jwt.js'


export default (state = '', e, { events, respond }) => {
  if (e.event !== events.init) {
    return typeof e.token === 'string' ? e.token : state
  }

  const { cookies, replays } = respond
  const token = isProd ? cookies.get('token') : createReplayToken(replays)

  return token ?? ''
}





const createReplayToken = ({ settings, db }) => {  
  if (!settings.userId) return ''
  
  const id = settings.userId

  const { roles } = db.user.docs[id]
  const payload = { id, roles }

  return jwt.sign(payload, secret, { noTimestamp: true })
}
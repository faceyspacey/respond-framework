import * as jwt from 'jsonwebtoken'
import { isServer, isProd } from './bools.js'
import secretMock from '../db/secret.mock.js'


export default isProd && isServer ? jwt : {
  sign(payload, secret = secretMock) {
    return secret + '_' + JSON.stringify(payload)
  },
  verify(token, secret = secretMock) {
    const prefix = secret + '_'
    if (token.indexOf(prefix) !== 0) return

    const json = token.replace(prefix, '')
    return JSON.parse(json)
  }
}


if (isProd) {
  const verify = jwt.verify.bind(jwt)

  jwt.verify = function(token, secret) {
    if (!token) return
    
    try {
      return verify(token, secret)
    }
    catch {}
  }
}
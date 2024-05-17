import * as jwt from 'jsonwebtoken'
import { isServer, isProd } from './bools.js'


export default isProd && isServer ? jwt : {
  sign(payload, secret) {
    return secret + '_' + JSON.stringify(payload)
  },
  verify(token, secret) {
    const prefix = secret + '_'
    if (token.indexOf(prefix) !== 0) return

    const json = token.replace(prefix, '')
    return JSON.parse(json)
  }
}
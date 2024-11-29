import * as qs from 'qs' // we like the qs library because it handles nested objects in query strings
import isNumber from './isNumber.js'
import revive from './revive.js'
import { canProxy } from '../proxy/utils/helpers.js'


export const parseSearch = (search, state) => {
  const ps = state?.options.parseSearch ?? parse
  return ps(search, state?.respond)
}

export const stringifyQuery = (query, state) => {
  const stringify = state?.options.stringifyQuery ?? qs.stringify
  return stringify(query)
}


const parse = (search, respond) => {
  const rev = respond?.revive(respond) ?? (v => v)
  let k

  const decoder = (v, defaultDecoder, charset, type) => {
    let ret

    if (type === 'key') {
      k = v
      ret = defaultDecoder(v)
    }
    else if (type === 'value') {
      ret = /^false|true$/.test(v)      ? v === 'true'
        : isNumber(v) && !/Id/.test(k)  ? parseInt(v)
        : /At$/.test(k)                 ? new Date(v)
        : canProxy(v)                   ? rev(v)
        :                                 defaultDecoder(v) // fallback to default decoder
    }

    return ret === '' ? undefined : ret
  }

  return qs.parse(search.replace(/^\?/, ''), { decoder })
}
import * as qs from 'qs' // we like the qs library because it handles nested objects in query strings
import isNumber from './isNumber.js'
import revive, { replacer } from './revive.js'
import { canProxy } from '../proxy/utils/helpers.js'


export const parseSearch = (search, state) => {
  const parse = state?.options.parseSearch ?? ps
  return parse(search, state)
}

export const stringifyQuery = (query, state) => {
  const stringify = state?.options.stringifyQuery ?? sq
  return stringify(query, state)
}


const ps = (search, state) => {
  const rev = revive(state)
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



const sq = (query, state) => {
  let k

  const encoder = (v, defaultEncoder, charset, type) => {
    if (type === 'key') {
      k = v
      return defaultEncoder(v)
    }
    else if (type === 'value') {
      return replacer(k, v)
    }
  }

  return qs.stringify(query, { encoder })
}
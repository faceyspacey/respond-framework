import * as qs from 'qs'
import isNumber from './isNumber.js'


export const parseSearch = (search, getStore) => {
  const parse = getStore?.().options.parseSearch || ps
  return parse(search)
}


const ps = search => {
  search = search.indexOf('?') === 0 ? search.substring(1) : search
  let k

  return qs.parse(search, {
    decoder: (v, defaultDecoder, charset, type) => {
      let ret

      if (type === 'key') {
        k = v
        ret = defaultDecoder(v)
      }
      else if (type === 'value') {
        ret = /^false|true$/.test(v)      ? JSON.parse(v) // converts boolean
          : isNumber(v) && !/Id/.test(k)  ? parseInt(v)
          :                                 defaultDecoder(v)
      }

      return ret === '' ? undefined : ret
    }
  })
}
// we like the qs library because it handles nested objects in query strings



export const stringifyQuery = (query, getStore) => {
  const stringify = getStore?.().options.stringifyQuery || qs.stringify
  return '?' + stringify(query)
}
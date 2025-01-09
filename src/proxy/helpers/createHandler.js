import { canProxy } from './utils.js'
import createProxy from '../createProxy.js'


export default (vns, cache, refIds, notify) => ({
  deleteProperty(o, k) {
    delete o[k]
    notify()
    return true
  },

  set(o, k, v) {
    const prev = o[k]

    if (prev === v)                    return true // re-assigning same proxy (or primitive value)
    if (prev && prev === cache.get(v)) return true // re-assigning same underlying object

    o[k] = canProxy(v) ? createProxy(v, vns, cache, refIds, notify) : v
    notify()
    return true
  }
})
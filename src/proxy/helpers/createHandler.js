import { canProxy } from './utils.js'
import createProxy from '../createProxy.js'


export default (vns, cache, refIds, notify) => ({
  deleteProperty(o, k) {
    const prev = o[k]

    vns.get(prev)?.parents.delete(notify)
    delete o[k]

    notify()
    
    return true
  },

  set(o, k, v) {
    const prev = o[k]

    if (prev === v || cache.has(v) && prev === cache.get(v)) return true // re-assigning same proxy || re-assigning same underlying object

    o[k] = canProxy(v) ? createProxy(v, vns, cache, refIds, notify) : v

    notify()

    return true
  },
})
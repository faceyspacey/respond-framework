import { canProxy } from './helpers.js'
import createProxy from '../createProxy.js'


export default (notify, subs, refIds, cache, snapCache) => ({
  deleteProperty(o, k) {
    const prev = o[k]

    subs.get(prev)?.remove(notify)
    delete o[k]

    notify()
    
    return true
  },

  set(o, k, v) {
    const prev = o[k]

    if (prev === v || cache.has(v) && prev === cache.get(v)) return true

    subs.get(prev)?.remove(notify)
    o[k] = canProxy(v) ? createProxy(v, subs, refIds, notify, cache, snapCache) : v // note: will need to simply add listener if assigning existing proxy

    notify()

    return true
  }
})
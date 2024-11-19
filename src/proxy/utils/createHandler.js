import { canProxy, equal } from './helpers.js'
import createProxy from '../createProxy.js'


export default (notify, subs, cache, snapCache) => ({
  deleteProperty(o, k) {
    const prev = o[k]

    subs.get(prev)?.remove(notify)
    delete o[k]

    notify()
    
    return true
  },

  set(o, k, v) {
    if (equal(o[k], v) || cache.has(v) && equal(cache.get(v), o[k])) return true

    subs.get(o[k])?.remove(notify)
    o[k] = canProxy(v) ? createProxy(v, notify, subs, cache, snapCache) : v // note: will need to simply add listener if assigning existing proxy

    notify()

    return true
  }
})
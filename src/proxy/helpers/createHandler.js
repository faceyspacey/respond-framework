import { canProxy } from './utils.js'
import createProxy from '../createProxy.js'


export default (notifyParent, vls, refIds, cache, snapCache) => ({
  deleteProperty(o, k) {
    const prev = o[k]

    vls.get(prev)?.remove(notifyParent)
    delete o[k]

    notifyParent()
    
    return true
  },

  set(o, k, v) {
    const prev = o[k]

    if (prev === v || cache.has(v) && prev === cache.get(v)) return true // re-assigning same proxy || re-assigning same underlying object
    
    vls.get(prev)?.remove(notifyParent)
    o[k] = canProxy(v) ? createProxy(v, vls, refIds, notifyParent, cache, snapCache) : v // note: will need to simply add listener if assigning existing proxy

    notifyParent()

    return true
  },

  get(o, k, proxy) {
    if (k === 'yolo') return vls.get(proxy)?.parents
    return Reflect.get(o, k)
  }
})
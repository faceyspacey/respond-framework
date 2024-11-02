import { proxyStates } from './helpers.js'


export default (notify, cache) => ({
  deleteProperty(o, k) {
    const prev = o[k]

    proxyStates.get(prev)?.remove(notify)
    delete o[k]

    notify()
    
    return true
  },

  set(o, k, v) {
    if (o[k] === v || cache.has(v) && cache.get(v) === o[k]) return true

    proxyStates.get(o[k])?.remove(notify)

    o[k] = v
    // o[k] = canProxy(v) ? createProxy(v, notify, cache) : v // note: will need to simple add listener if assigning existing proxy
    notify()

    return true
  }
})
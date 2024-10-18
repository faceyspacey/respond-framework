import { proxyStates } from './helpers.js'


export default (notify, cache) => ({
  deleteProperty(o, k) {
    const prev = o[k]

    proxyStates.get(prev)?.remove(notify)
    delete o[k]

    notify()
    
    return true
  },

  set(o, k, v, proxy) {
    const prev = o[k]

    const equal = prev === v || cache.has(v) && Object.is(prev, cache.get(v))
    if (equal) return true

    proxyStates.get(prev)?.remove(notify)

    o[k] = v
    // o[k] = canProxy(v) ? createProxy(v, proxy, cache) : v
    notify()

    return true
  }
})
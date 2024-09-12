import { proxyStates } from './helpers.js'


export default (notify, cache) => ({
  deleteProperty(orig, k) {
    const prev = orig[k]

    proxyStates.get(prev)?.remove(notify)
    delete orig[k]

    notify()
    
    return true
  },

  set(orig, k, v) {
    const prev = orig[k]

    const equal = prev === v || cache.has(v) && Object.is(prev, cache.get(v))
    if (equal) return true

    proxyStates.get(prev)?.remove(notify)

    orig[k] = v
    notify()

    return true
  }
})
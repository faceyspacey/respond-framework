import createProxy from '../createProxy.js'
import { proxyStates, canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (orig, notify, store, parent, path, cache, moduleProxy, parentProxy) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)

  const pc = cache.proxy

  const proxy = new Proxy(orig, {
    deleteProperty(orig, k) {
      const prev = orig[k]

      proxyStates.get(prev)?.remove(notify)
      delete orig[k]

      return true
    },

    set(orig, k, v) {
      const prev = orig[k]

      const equal = prev === v || pc.has(v) && Object.is(prev, pc.get(v))
      if (equal) return true

      proxyStates.get(prev)?.remove(notify)

      orig[k] = v
      notify()

      return true
    },

    get(orig, k, proxy) {
      if (k === '_state') return moduleProxy
      if (k === '_parent') return parentProxy

      const s = trySelector(k, proxy, selectors, parent)
      if (s !== NO_SELECTOR) return s
      
      // let v = orig[k]

      let { get, value: v } = Reflect.getOwnPropertyDescriptor(orig, k) ?? {}

      if (k === 'push') console.log('push', get, v)
      if (typeof v === 'function') {
        return isModule ? v.bind(moduleProxy) : v.bind(proxy)
      }
      else if (get) {
        window.proxy = moduleProxy
        return isModule ? get.call(moduleProxy) : get.call(proxy)
      }
      else {
        v = orig[k]
      }

      if (!proxyStates.has(v) && canProxy(v)) {
        const p = path ? `${path}.${k}` : k

      //  if (!v._state) {
      //   Object.defineProperty(v, '_state', { get() { return moduleProxy }, enumerable: false, configurable: true })
      //   Object.defineProperty(v, '_parent', { get() { return parentProxy }, enumerable: false, configurable: true })
      //  }

        v = orig[k] = createProxy(v, store, proxy, notify, p, cache, moduleProxy, parentProxy)
      }

      proxyStates.get(v)?.listeners.add(notify)

      return v
    }
    
    // get(orig, k, proxy) {
    //   const s = trySelector(k, proxy, selectors, parent)
    //   if (s !== NO_SELECTOR) return s
      
    //   const v = orig[k]
    //   if (proxyStates.has(v) || !canProxy(v)) return v

    //   const p = path ? `${path}.${k}` : k
    //   return orig[k] = createProxy(v, store, proxy, notify, p, cache)
    // }
  })

  parentProxy = isModule ? moduleProxy : parentProxy
  moduleProxy = isModule ? proxy : moduleProxy

  return proxy
}
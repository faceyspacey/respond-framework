import createProxy from '../createProxy.js'
import { proxyStates, canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (orig, notify, store, parent, path, cache) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)

  const proto = Object.getPrototypeOf(orig)
  const protoDescriptors = Object.getOwnPropertyDescriptors(proto)

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
      if (k === '_state') return window.store.state
      if (k === '_parent') return parent

      const s = trySelector(k, proxy, selectors, parent)
      if (s !== NO_SELECTOR) return s

      if (!orig.hasOwnProperty(k)) {
        const get = protoDescriptors[k]?.get
        return get ? get.call(proxy) : orig[k]
      }

      let v = orig[k]

      // if (!proxyStates.has(v) && canProxy(v)) {
      //   const p = path ? `${path}.${k}` : k
      //   v = orig[k] = createProxy(v, store, proxy, notify, p, cache, moduleProxy, parentProxy)
      // }

      // proxyStates.get(v)?.listeners.add(notify)

      return v
    }
  })

  // parentProxy = isModule ? moduleProxy : parentProxy
  // moduleProxy = isModule ? proxy : moduleProxy

  return proxy
}
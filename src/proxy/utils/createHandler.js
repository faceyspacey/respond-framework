import createProxy from '../createProxy.js'
import { proxyStates, canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (notify, store, parent, path, cache) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)
  const pc = cache.proxy

  return {
    deleteProperty(orig, k) {
      proxyStates.get(orig[k])?.listeners.delete(notify)
      delete orig[k]
      return true
    },

    set(orig, k, v) {
      const prev = orig[k]
      
      const equal = Object.is(prev, v) || pc.has(v) && Object.is(prev, pc.get(v))
      if (equal) return true

      proxyStates.get(v)?.listeners.add(notify) // moving existing proxy somewhere else in state

      orig[k] = v
      notify()

      return true
    },

    get(orig, k, proxy) {
      const s = trySelector(k, proxy, selectors, parent)
      if (s !== NO_SELECTOR) return s
      
      const v = orig[k]
      if (proxyStates.has(v) || !canProxy(v)) return v

      const p = path ? `${path}.${k}` : k
      return orig[k] = createProxy(v, store, proxy, p, notify, cache)
    }
  }
}
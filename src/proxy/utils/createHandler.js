import { proxyStates, canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (cache, notify, init, parent, store, path) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)

  return {
    deleteProperty(target, k) {
      const deleted = Reflect.deleteProperty(target, k)
      if (deleted) notify()
      return deleted
    },


    set(target, k, v, receiver) {
      const has = !init() && Reflect.has(target, k)
      const prev = Reflect.get(target, k, receiver)

      const equal = has && (Object.is(prev, v) || cache.has(v) && Object.is(prev, cache.get(v)))
      if (equal) return true

      if (!proxyStates.has(v) && canProxy(v)) {
        const p = path ? `${path}.${k}` : k
        v = createProxy(v, store, p, receiver)
      }

      Reflect.set(target, k, v, receiver)
      notify()

      return true
    },


    get(target, k, receiver) {
      const s = trySelector(k, receiver, selectors, parent)
      return s !== NO_SELECTOR ? s : Reflect.get(target, k, receiver)
    }
  }
}
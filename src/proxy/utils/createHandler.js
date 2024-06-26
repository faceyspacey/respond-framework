import createProxy from '../createProxy.js'
import { proxyStates, canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (notify, listeners, store, parent, path, cache) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)
  const pc = cache.proxy

  return {
    deleteProperty(target, k) {
      const v = Reflect.get(target, k)
      proxyStates.get(v)?.listeners.delete(notify)
      
      const deleted = Reflect.deleteProperty(target, k)
      if (deleted) notify()
        
      return deleted
    },


    set(target, k, v, receiver) {
      const init = listeners.size === 0

      const has = !init && Reflect.has(target, k)
      const prev = Reflect.get(target, k, receiver)

      const equal = has && (Object.is(prev, v) || pc.has(v) && Object.is(prev, pc.get(v)))
      if (equal) return true

      if (!proxyStates.has(v) && canProxy(v)) {
        const p = path ? `${path}.${k}` : k
        v = createProxy(v, store, receiver, p, cache)
      }

      proxyStates.get(v)?.listeners.add(notify)

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
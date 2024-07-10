import { sliceByModulePath } from '../../utils.js'
import { canProxy, proxyStates } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'


export default function createSnapshot(orig, version, cache, store, path = '', moduleProxy) {
  window.snapCache = cache
  const { version: v, snap: s } = cache.get(orig) ?? {}
  if (v === version) return s

  const snap = Array.isArray(orig)
    ? []
    : Object.create(Object.getPrototypeOf(orig))

  cache.set(orig, { snap, version })

  // const isModule = !!store.modulePaths[path]
  // const selectors = isModule && sliceByModulePath(store.selectors, path)

  // moduleProxy = isModule ? new Proxy(snap, {
  //   get(snap, k, proxy) {
  //     const selected = trySelector(k, proxy, selectors)
  //     if (selected !== NO_SELECTOR) return selected

  //     return Reflect.get(snap, k)
  //   }
  // }) : moduleProxy

  Object.keys(orig).forEach(k => {
    const { get } = Reflect.getOwnPropertyDescriptor(orig, k)
 
    if (get) {
      Object.defineProperty(snap, k, {
        get,
        enumerable: true,
        configurable: true,
      })
    }
    else {
      const value = Reflect.get(orig, k)
      const { orig: child, getVersion } = proxyStates.get(value) ?? {} // value may be proxy, since proxies are mutably assigned to orig

      Object.defineProperty(snap, k, {
        enumerable: true,
        configurable: true,
        writable: true, // todo: need to find why we needed this, and remove it
        value: child
          ? createSnapshot(child, getVersion(), cache, store, path ? `${path}.${k}` : k, moduleProxy)
          : canProxy(value)
            ? createSnapshot(value, -1, cache, store, path ? `${path}.${k}` : k, moduleProxy) // lazy object, not yet made a proxy
            : value,
      })
    }
  })

  // if (!snap._state) {
  //   Object.defineProperty(snap, '_state', { get() { return moduleProxy }, enumerable: false })
  // }

  return snap // Object.preventExtensions(snap) -- todo: need to find why we needed this, and bring this back
}
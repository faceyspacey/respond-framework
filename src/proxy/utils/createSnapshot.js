import { canProxy, proxyStates } from './helpers.js'


export default function createSnapshot(orig, version, cache, path = '', proxy) {
  const { version: v, snap: s } = cache.get(orig) ?? {}
  if (v === version) return s

  const snap = Array.isArray(orig) ? [] : {}

  cache.set(orig, { snap, version })

  Object.keys(orig).forEach(k => {
    const value = Reflect.get(orig, k)
    const { orig: child, getVersion } = proxyStates.get(value) ?? {} // value may be proxy, since proxies are mutably assigned to orig

    Object.defineProperty(snap, k, {
      enumerable: true,
      configurable: true,
      writable: true, // todo: need to find why we needed this, and remove it
      value: child
        ? createSnapshot(child, getVersion(), cache, path ? `${path}.${k}` : k)
        : canProxy(value)
          ? createSnapshot(value, -1, cache, path ? `${path}.${k}` : k)
          : value,
    })
  })

  return snap // Object.preventExtensions(snap) -- todo: need to find why we needed this, and bring this back
}
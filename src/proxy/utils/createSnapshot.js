import { proxyStates } from './helpers.js'


export default function createSnapshot(target, version, cache) {
  const { version: v, snap: s } = cache.get(target) ?? {}
  if (v === version) return s

  const snap = Array.isArray(target) ? [] : {}
      
  cache.set(target, { snap, version })

  Object.keys(target).forEach(k => {
    const value = Reflect.get(target, k)
    const { target: child, getVersion } = proxyStates.get(value) ?? {}

    Object.defineProperty(snap, k, {
      value: child ? createSnapshot(child, getVersion(), cache) : value,
      enumerable: true,
      configurable: true,
      writable: true // need to find why we needed this, and remove it
    })
  })

  return snap // Object.preventExtensions(snap)
}

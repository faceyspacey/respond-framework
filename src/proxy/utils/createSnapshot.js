import { proxyStates } from './helpers.js'


export default function createSnapshot(target, version, cache, path = '') {
  const { version: v, snap: s } = cache.get(target) ?? {}
  if (v === version) return s

  const snap = Array.isArray(target)
    ? []
    : Object.create(Object.getPrototypeOf(target))
      
  cache.set(target, { snap, version })

  Reflect.ownKeys(target).forEach(k => {
    if (Object.getOwnPropertyDescriptor(snap, k)) return // Only the known case is Array.length so far.

    const value = Reflect.get(target, k)
    const { target: child, getVersion } = proxyStates.get(value) ?? {}

    Object.defineProperty(snap, k, {
      value: child ? createSnapshot(child, getVersion(), cache, path ? `${path}.${k}` : k) : value,
      enumerable: true,
      configurable: true,
      writable: true // need to find why we needed this, and remove it
    })
  })

  return snap // Object.preventExtensions(snap)
}

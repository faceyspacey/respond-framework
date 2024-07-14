import { proxyStates, snapsToProxyCache } from './utils/helpers.js'


export default function snapshot(proxy) {
  const state = proxyStates.get(proxy)
  return state ? createSnapshot(proxy, state) : proxy // proxy : not proxy yet (lazy or primitive)
}


function createSnapshot(proxy, { orig, version, cache, listeners, notify }) {
  const { version: v, snap: s } = cache.snap.get(orig) ?? {}
  if (v === version) return s

  const snap = Array.isArray(orig) ? [] : Object.create(Object.getPrototypeOf(orig)) // computed methods/selectors on prototype

  cache.snap.set(orig, { snap, version })
  snapsToProxyCache.set(snap, { orig, proxy, listeners, notify })

  Object.keys(orig).forEach(k => {
    const value = snapshot(orig[k])
    Object.defineProperty(snap, k, { enumerable: true, configurable: true, writable: true, value })
  })

  return snap // Object.preventExtensions(snap) -- todo: need to find why we needed this, and bring this back (and writable: true)
}
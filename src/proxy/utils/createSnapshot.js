import { sliceByModulePath } from '../../utils.js'
import { canProxy, proxyStates, snapsToProxyCache } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import snapshot from '../snapshot.js'


export default function createSnapshot(orig, version, cache, proxy, state = {}) {
  const { version: v, snap: s } = cache.get(orig) ?? {}
  if (v === version) return s

  const snap = Array.isArray(orig) ? [] : Object.create(Object.getPrototypeOf(orig))
  const { listeners, notify } = state

  snapsToProxyCache.set(snap, { orig, proxy, listeners, notify })
  cache.set(orig, { snap, version })

  Object.keys(orig).forEach(k => {
    Object.defineProperty(snap, k, {
      enumerable: true,
      configurable: true,
      writable: true, // todo: need to find why we needed this, and remove it
      value: snapshot(orig[k])
    })
  })

  return snap // Object.preventExtensions(snap) -- todo: need to find why we needed this, and bring this back
}
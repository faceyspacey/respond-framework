import { proxyStates, snapsToProxyCache, canProxy } from './utils/helpers.js'


export default function snapshot(proxy) {
  const state = proxyStates.get(proxy)
  return state ? createSnapshot(proxy, state) : proxy // proxy : not proxy yet (lazy or primitive)
}


function createSnapshot(proxy, { orig: o, version, cache, listeners, notify }) {
  const { version: v, snap: s } = cache.snap.get(o) ?? {}
  if (v === version) return s

  const snap = isArray(o) ? [] : create(getProto(o)) // computed methods/selectors on prototype

  cache.snap.set(o, { snap, version })
  snapsToProxyCache.set(snap, { orig: o, proxy, listeners, notify, cache })

  keys(o).forEach(k => snap[k] = snapshot(o[k]))

  return snap // Object.preventExtensions(snap) -- todo: need to find why we needed this, and bring this back (and writable: true)
}



export const snapDeepClone = o => {
  if (!canProxy(o)) return o
  const snap = isArray(o) ? [] : create(getProto(o))
  keys(o).forEach(k => snap[k] = snapDeepClone(o[k]))
  return snap
}


const isArray = Array.isArray
const keys = Object.keys
const getProto = Object.getPrototypeOf
const create = Object.create
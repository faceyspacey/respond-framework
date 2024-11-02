import { proxyStates, canProxy } from './utils/helpers.js'


export default function snapshot(proxy) {
  const sub = proxyStates.get(proxy)
  return sub ? createSnapshot(sub) : proxy // proxy : primitive value
}


function createSnapshot({ orig: o, version, cache }) {
  const { version: v, snap: s } = cache.get(o) ?? {}
  if (v === version) return s

  const snap = isArray(o) ? [] : create(getProto(o)) // computed methods/selectors on prototype
  cache.set(o, { snap, version })

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
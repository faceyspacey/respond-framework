import { isArray, keys, getProto, create } from './utils/helpers.js'


export default function snapshot(proxy, subs = this.subscribers) {
  const sub = subs.get(proxy)
  return sub ? createSnapshot(sub, subs) : proxy // proxy : primitive value
}


function createSnapshot({ orig: o, version, cache }, subs) {
  const { version: v, snap: s } = cache.get(o) ?? {}
  if (v === version) return s

  const snap = isArray(o) ? [] : create(getProto(o)) // computed methods/selectors on prototype
  cache.set(o, { snap, version })

  keys(o).forEach(k => snap[k] = snapshot(o[k], subs))

  return snap // Object.preventExtensions(snap) -- todo: need to find why we needed this, and bring this back (and writable: true)
}
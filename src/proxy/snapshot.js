import { isArray, keys, getProto, create } from './utils/helpers.js'


export default function(proxy = this.state, vls = this.versionListeners) {
  const vl = vls.get(proxy)
  return vl ? createSnapshot(vl, vls) : proxy // proxy : primitive value
}

function snapshot(proxy, vls) {
  const vl = vls.get(proxy)
  return vl ? createSnapshot(vl, vls) : proxy // proxy : primitive value
}

function createSnapshot({ orig: o, version, cache, snapToOrig }, vls) {
  const { version: v, snap: s } = cache.get(o) ?? {}
  if (v === version) return s

  const snap = isArray(o) ? [] : create(getProto(o)) // computed methods/selectors on prototype
  cache.set(o, { snap, version })
  snapToOrig.set(snap, o)

  keys(o).forEach(k => snap[k] = snapshot(o[k], vls))

  return snap // Object.preventExtensions(snap) -- todo: need to find why we needed this, and bring this back (and writable: true)
}
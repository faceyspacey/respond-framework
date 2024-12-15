import cloneDeep from './utils/cloneDeep.js'
import { isArray, keys, getProto, create } from './utils/helpers.js'


export default function(proxy = this.state, vls = this.versionListeners) {
  if (!vls.get(proxy)) return cloneDeep(proxy) // because snapshots before proxication otherwise return the entire original object, and need to be separate references
  return snapshot(proxy, vls)
}

function snapshot(proxy, vls) {
  const vl = vls.get(proxy)
  return vl ? createSnapshot(vl, vls) : proxy // proxy : primitive value
}

function createSnapshot({ orig: o, version, cache }, vls) {
  const { version: v, snap: s } = cache.get(o) ?? {}
  if (v === version) return s

  const snap = isArray(o) ? [] : create(getProto(o)) // computed methods/selectors on prototype
  cache.set(o, { snap, version })

  keys(o).forEach(k => snap[k] = snapshot(o[k], vls))

  return Object.preventExtensions(snap)
}
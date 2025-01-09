import cloneDeep from './helpers/cloneDeep.js'
import { isArray, keys, getProto, create } from './helpers/utils.js'


export default function(proxy = this.state, vns = this.versionNotifiers, cache = this.snapCache) {
  const vn = vns.get(proxy)
  return vn ? createSnapshot(vn, vns, cache) : cloneDeep(proxy) // because snapshots before proxication otherwise return the entire original object, and need to be separate references -- important for triggerPlugin's creation of prevState, which must not share references with the current state, or prevState will be the same as current state
}

function snapshot(proxy, vns, cache) {
  const vn = vns.get(proxy)
  return vn ? createSnapshot(vn, vns, cache) : proxy // proxy : primitive value
}

function createSnapshot({ orig: o, version }, vns, cache) {
  const { version: v, snap: s } = cache.get(o) ?? {}
  if (v === version) return s

  const snap = isArray(o) ? [] : create(getProto(o)) // computed methods/selectors on prototype
  cache.set(o, { snap, version })

  keys(o).forEach(k => snap[k] = snapshot(o[k], vns, cache))

  return snap
}
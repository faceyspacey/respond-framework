import { isObject, isOwnKeysChanged } from './helpers.js'


export default function isChanged(prev, next, affected, cache = new WeakMap) {
  if (prev === next) return false
  if (!isObject(prev) || !isObject(next)) return true // heuristic: if one isn't an object, and already not equal from line above, we know they are not equal without recursive checking

  const used = affected.get(prev)
  if (!used) return true
  
  const hit = cache.get(prev)
  if (hit === next) return false

  cache.set(prev, next) // for object references with cycles (and perf on refs appearing in sibling branches)

  for (const k of used.get || empty) {
    if (isChanged(prev[k], next[k], affected)) return true
  }
  
  for (const k of used.has || empty) {
    if (has(prev, k) !== has(next, k)) return true
  }

  if (used.ownKeys) {
    if (isOwnKeysChanged(prev, next)) return true
  }
  else {
    for (const k of used.getOwnPropertyDescriptor || empty) {
      if (!!gopd(prev, k) !== !!gopd(next, k)) return true
    }
  }

  return false
}


const empty = []
const has = Reflect.has
const gopd = Reflect.getOwnPropertyDescriptor
import { isObject, getOriginalObject, isOwnKeysChanged } from './helpers.js'


export default function isChanged(prev, next, affected, cache = new WeakMap) {
  if (Object.is(prev, next)) return false
  if (!isObject(prev) || !isObject(next)) return true

  const used = affected.get(getOriginalObject(prev))
  if (!used) return true

  const hit = cache.get(prev)
  if (hit?.next === next) return hit.changed

  cache.set(prev, { next, changed: false }) // for object with cycles

  let changed = null

  try {
    for (const k of used.has || []) {
      changed = Reflect.has(prev, k) !== Reflect.has(next, k)
      if (changed) return changed
    }

    if (used.ownKeys) {
      changed = isOwnKeysChanged(prev, next)
      if (changed) return changed
    }
    else {
      for (const k of used.getOwnPropertyDescriptor || []) {
        const hasPrev = !!Reflect.getOwnPropertyDescriptor(prev, k)
        const hasNext = !!Reflect.getOwnPropertyDescriptor(next, k)

        changed = hasPrev !== hasNext
        if (changed) return changed
      }
    }

    for (const k of used.keys || []) {
      changed = isChanged(prev[k], next[k], affected, cache)
      if (changed) return changed
    }

    if (changed === null) changed = true
    return changed
  }
  finally {
    cache.set(prev, { next, changed })
  }
}
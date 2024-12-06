import { isObj, isOwnKeysChanged } from './helpers.js'


export default function isChanged(prev, next, affected) {
  if (prev === next) return false
  if (!isObj(prev) || !isObj(next)) return true // heuristic: if one isn't an object, and already not equal from line above, we know they are not equal without recursive checking

  const used = affected.get(prev)
  if (!used) return true
  
  if (used.get)
    for (const k of used.get)
      if (isChanged(prev[k], next[k], affected)) return true
  
  if (used.has)
    for (const k of used.has) 
      if (has(prev, k) !== has(next, k)) return true

  if (used.ownKeys) 
    if (isOwnKeysChanged(prev, next)) return true
  
  else if (used.gopd)
    for (const k of used.gopd)
      if (!!gopd(prev, k) !== !!gopd(next, k)) return true
}


const has = Reflect.has
const gopd = Reflect.getOwnPropertyDescriptor
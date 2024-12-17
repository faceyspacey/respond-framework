import { _module } from '../../createModule/reserved.js'
import { isObj, isOwnKeysChanged } from './utils.js'


export default function isChanged(prev, next, affected) {
  if (prev === next) return false
  if (!isObj(prev) || !isObj(next)) return true // heuristic: if one isn't an object, and already not equal from line above, we know they are not equal without recursive checking

  const used = affected.get(prev)
  if (!used) return !prev[_module] // always return true for non modules, as reactivity could get cut off in some cases when passed to a memoized component; another similar case is `!state.obj` which would also have nothing `used` but still requires reactive rendering; however for modules, we don't want these extra occasionally unnecessary renders, as there's no need to pass a module reference as a prop, as children can gain access to it directly; this also improves `prevState` in the case that only `state.prevState` is accessed, which since it uses a separate useSnapshot hook, would otherwise trigger an unnecessary render due to state not being accessed

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
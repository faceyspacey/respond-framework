import { canProxy, isArray, keys, getProto, create } from './helpers.js'


export default function cloneDeep(o) {
  if (!canProxy(o)) return o
  const snap = isArray(o) ? [] : create(getProto(o))
  keys(o).forEach(k => snap[k] = cloneDeep(o[k]))
  return snap
}


export function cloneDeepModulesOnly(o) {
  const snap = create(getProto(o))
  Object.assign(snap, o)

  o.moduleKeys.forEach(k => { 
    snap[k] = cloneDeepModulesOnly(o[k])
  })

  return snap
}
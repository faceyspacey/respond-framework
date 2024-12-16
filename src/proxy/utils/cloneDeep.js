import { canProxy, isArray, keys, getProto, create } from './helpers.js'


export default function cloneDeep(o) {
  if (!canProxy(o)) return o
  const snap = isArray(o) ? [] : create(getProto(o))
  keys(o).forEach(k => snap[k] = cloneDeep(o[k]))
  return snap
}
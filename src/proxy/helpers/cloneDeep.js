import { canProxy, isArray, keys, getProto, create } from './utils.js'


export default function cloneDeep(o) {
  if (!canProxy(o)) return o
  const snap = isArray(o) ? [] : create(getProto(o))
  keys(o).forEach(k => snap[k] = cloneDeep(o[k]))
  return snap
}
import createHandler from './helpers/createHandler.js'
import findExistingProxy from './helpers/findExistingProxy.js'
import { _module, _top } from '../createModule/reserved.js'
import { canProxy, isArray, create, getProto } from './helpers/utils.js'
import { VersionNotifier as VN, VNModule, VNTop } from './VersionNotifier.js'


export default function createProxy(o, vns, cache, refIds, notify = function() {}) {
  const found = findExistingProxy(o, vns, cache, refIds, notify)
  if (found) return found

  const obj = isArray(o) ? [] : create(getProto(o))

  const VersionNotifier = o[_module] ? (o[_top] ? VNTop : VNModule) : VN // polymorphic version notifier -- based on whether module, top module, or other objects
  const vn = new VersionNotifier(obj)

  const proxy = new Proxy(obj, createHandler(vns, cache, refIds, vn.notify))

  cache.set(o, proxy)
  vns.set(proxy, vn)

  vn.parents.add(notify)

  Object.keys(o).forEach(k => {
    const v = o[k]
    obj[k] = canProxy(v) ? createProxy(v, vns, cache, refIds, vn.notify) : v
  })

  return proxy
}
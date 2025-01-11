import createHandler from './helpers/createHandler.js'
import findExistingProxy from './helpers/findExistingProxy.js'
import { _module, _top } from '../createModule/reserved.js'
import { canProxy, isArray, create, getProto } from './helpers/utils.js'
import { VersionNotifier as VN, VNModule, VNTop } from './VersionNotifier.js'


export default function createProxy(o, vns, cache, refIds, notify = function() {}) {
  const found = findExistingProxy(o, vns, cache, refIds, notify) // proxy exists elsewhere and can be re-used; parents.add(notify) will be called to re-make the link
  if (found) return found

  const obj = isArray(o) ? [] : create(getProto(o)) // prepare clone
  const VersionNotifier = o[_module] ? (o[_top] ? VNTop : VNModule) : VN // polymorphic version notifier -- based on whether module, top module, or other objects

  const vn = new VersionNotifier(obj)
  const proxy = new Proxy(obj, createHandler(vns, cache, refIds, vn.notify)) // vn.notify allows assigned children to notify parents of changes

  cache.set(o, proxy) // obj -> proxy
  vns.set(proxy, vn)  // proxy -> vn

  vn.parents.add(notify) // proxy/obj/vn trio now notify parents of changes -- `notify` is vn.notify function of parent

  Object.keys(o).forEach(k => {
    const v = o[k]
    obj[k] = canProxy(v) ? createProxy(v, vns, cache, refIds, vn.notify) : v // copy to clone, making proxies where necessary
  })

  return proxy
}
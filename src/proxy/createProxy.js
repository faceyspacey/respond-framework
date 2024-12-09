import { canProxy, isArray, create, getProto } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'
import { ObjectId } from 'bson'


export default function createProxy(o, vls, refIds, notifyParent = function() {}, cache =  new WeakMap, snapCache = new WeakMap) {
  const found = findExistingProxyOrObject(o, notifyParent, vls, refIds, cache)
  if (found) return found

  const orig = isArray(o) ? [] : create(getProto(o))

  const vl = new VersionListener(orig, vls, snapCache)
  const proxy = new Proxy(orig, createHandler(vl.notify, vls, refIds, cache, snapCache))

  cache.set(o, proxy)
  vls.set(proxy, vl)

  vl.listeners.add(notifyParent)

  Object.keys(o).forEach(k => {
    const v = o[k]
    orig[k] = canProxy(v) ? createProxy(v, vls, refIds, vl.notify, cache, snapCache) : v
  })

  return proxy
}



let highestVersion = 0


class VersionListener {
  version = highestVersion
  listeners = new Set

  constructor(orig, vls, cache) {
    this.orig = orig
    this.vls = vls
    this.cache = cache
  }

  notify = (next = ++highestVersion) => {
    if (this.version === next) return
    this.version = next
    this.listeners.forEach(listener => listener(this.version))
  }

  remove = notifyParent => {
    this.listeners.delete(notifyParent)
    if (this.listeners.size) return // proxy is assigned elsewhere and therefore has other listeners
    Object.values(this.orig).forEach(v => this.vls.get(v)?.remove(this.notify)) // however, if no more listeners, attempt to recursively remove listeners from children if they also aren't assigned elsewhere
  }
}



const findExistingProxyOrObject = (po, notifyParent, vls, refIds, cache) => {
  const vl = vls.get(po)

  if (vl) {                          // proxy assigned that exists elsewhere
    vl.listeners.add(notifyParent)

    if (!refIds.has(vl.orig)) {
      refIds.set(vl.orig, new ObjectId().toString())
    }

    return po
  }

  const proxy = cache.get(po)

  if (proxy) {                         // object assigned that exists somewhere else as a proxy
    const vl = vls.get(proxy)
    vl.listeners.add(notifyParent)

    if (!refIds.has(po)) {
      refIds.set(po, new ObjectId().toString())
    }

    return proxy
  }
}


export const refIds = new WeakMap
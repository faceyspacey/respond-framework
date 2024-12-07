import { canProxy, isArray, create, getProto } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'
import { ObjectId } from 'bson'


export default function createProxy(o, subs, refIds, notifyParent = function() {}, cache =  new WeakMap, snapCache = new WeakMap) {
  const found = findExistingProxyOrObject(o, notifyParent, subs, refIds, cache)
  if (found) return found

  const orig = isArray(o) ? [] : create(getProto(o))

  const sub = new Subscription(orig, subs, snapCache)
  const proxy = new Proxy(orig, createHandler(sub.notify, subs, refIds, cache, snapCache))

  cache.set(o, proxy)
  subs.set(proxy, sub)

  sub.listeners.add(notifyParent)

  Object.keys(o).forEach(k => {
    const v = o[k]
    orig[k] = canProxy(v) ? createProxy(v, subs, refIds, sub.notify, cache, snapCache) : v
  })

  return proxy
}



let highestVersion = 0


class Subscription {
  version = highestVersion
  listeners = new Set

  constructor(orig, subs, cache) {
    this.orig = orig
    this.subs = subs
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
    Object.values(this.orig).forEach(v => this.subs.get(v)?.remove(this.notify)) // however, if no more listeners, attempt to recursively remove listeners from children if they also aren't assigned elsewhere
  }
}



const findExistingProxyOrObject = (po, notifyParent, subs, refIds, cache) => {
  const sub = subs.get(po)

  if (sub) {                          // proxy assigned that exists elsewhere
    sub.listeners.add(notifyParent)

    if (!refIds.has(sub.orig)) {
      refIds.set(sub.orig, new ObjectId().toString())
    }

    return po
  }

  const proxy = cache.get(po)

  if (proxy) {                         // object assigned that exists somewhere else as a proxy
    const sub = subs.get(proxy)
    sub.listeners.add(notifyParent)

    if (!refIds.has(po)) {
      refIds.set(po, new ObjectId().toString())
    }

    return proxy
  }
}


export const refIds = new WeakMap
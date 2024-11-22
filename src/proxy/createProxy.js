import { canProxy } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'


export default function createProxy(o, subs = new WeakMap, refIds, notifyParent = function() {}, cache =  new WeakMap, snapCache = new WeakMap) {
  const found = findExistingProxyOrObject(o, notifyParent, subs, refIds, cache)
  if (found) return found

  const sub = new Subscription(o, subs, snapCache)
  const proxy = new Proxy(o, createHandler(sub.notify, subs, refIds,cache, snapCache))

  cache.set(o, proxy)
  subs.set(proxy, sub)

  sub.listeners.add(notifyParent)

  Object.keys(o).forEach(k => {
    const v = o[k]
    o[k] = canProxy(v) ? createProxy(v, subs, refIds, sub.notify, cache, snapCache) : v
  })

  return proxy
}



let highestVersion = 0


class Subscription {
  version = highestVersion
  listeners = new Set

  constructor(orig, subs,cache) {
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
  const sub = subs.get(po)       // proxy assigned that exists elsewhere

  if (sub) {
    sub.listeners.add(notifyParent)

    if (!refIds.has(sub.orig)) {
      refIds.set(sub.orig, counter++)
    }

    return po
  }

  const proxy = cache.get(po)  // object assigned that exists somewhere else as a proxy

  if (proxy) {
    const sub = subs.get(proxy)
    sub.listeners.add(notifyParent)

    if (!refIds.has(po)) {
      refIds.set(po, counter++)
    }

    return proxy
  }
}

let counter = 0
export const refIds = new WeakMap
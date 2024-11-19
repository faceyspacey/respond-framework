import { canProxy, ref } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'
import { ObjectId } from 'bson'


export default function createProxy(o, notifyParent = function() {}, subs = new WeakMap, cache =  new WeakMap, snapCache = new WeakMap) {
  ref.subs = subs
  const found = findExistingProxyOrObject(o, notifyParent, subs, cache)
  if (found) return found

  const sub = new Subscription(o, subs, snapCache)
  const proxy = new Proxy(o, createHandler(sub.notify, subs, cache, snapCache))

  cache.set(o, proxy)
  subs.set(proxy, sub)

  sub.listeners.add(notifyParent)

  Object.keys(o).forEach(k => {
    const v = o[k]
    o[k] = canProxy(v) ? createProxy(v, sub.notify, subs, cache, snapCache) : v
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



const findExistingProxyOrObject = (po, notifyParent, subs, cache) => {
  const sub = subs.get(po)       // proxy assigned that exists elsewhere

  if (sub) {
    sub.listeners.add(notifyParent)

    if (!sub.orig.__refId) {
      Object.defineProperty(sub.orig, '__refId', { value: new ObjectId().toString(), enumerable: false })
    }

    return po
  }

  const proxy = cache.get(po)  // object assigned that exists somewhere else as a proxy

  if (proxy) {
    const sub = subs.get(proxy)
    sub.listeners.add(notifyParent)

    if (!po.__refId) {
      Object.defineProperty(po, '__refId', { value: new ObjectId().toString(), enumerable: false })
    }

    return proxy
  }
}
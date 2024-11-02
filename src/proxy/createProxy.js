
import { canProxy, proxyStates as ps } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'


export default function createProxy(o, notifyParent = function() {}, cache =  new WeakMap, snapCache = new WeakMap) {
  const found = handleExistingProxy(o, notifyParent, cache)
  if (found) return found

  const sub = new Subscription(o, snapCache)
  const proxy = new Proxy(o, createHandler(sub.notify, cache, snapCache))

  cache.set(o, proxy)
  ps.set(proxy, sub)

  sub.listeners.add(notifyParent)

  keys(o).forEach(k => {
    const v = o[k]
    o[k] = canProxy(v) ? createProxy(v, sub.notify, cache, snapCache) : v
  })

  return proxy
}



let highestVersion = 0


class Subscription {
  version = highestVersion
  listeners = new Set

  constructor(orig, cache) {
    this.orig = orig
    this.cache = cache
  }

  notify = (next = ++highestVersion) => {
    if (this.version === next) return
    this.version = next
    this.listeners.forEach(listener => listener(this.version))
  }

  remove = (notifyParent) => {
    this.listeners.delete(notifyParent)
    if (this.listeners.size) return // proxy is assigned elsewhere and therefore has other listeners
    Object.values(this.orig).forEach(v => ps.get(v)?.remove(this.notify)) // however, if no more listeners, attempt to recursively remove listeners from children if they also aren't assigned elsewhere
  }
}



const handleExistingProxy = (o, notifyParent, cache) => {
  const sub = ps.get(o)       // object that exists as a proxy

  if (sub) {
    sub.listeners.add(notifyParent)
    return o
  }

  const proxy = cache.get(o)  // object that exists somewhere else as a proxy

  if (proxy) {
    const sub = ps.get(proxy)
    sub.listeners.add(notifyParent)
    return proxy
  }
}



const keys = Object.keys
import { canProxy, isArray, create, getProto } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'
import { _module } from '../store/reserved.js'
import queueNotification from './utils/queueNotification.js'


export default function createProxy(o, vls, refIds, notifyParent, cache =  new WeakMap, snapCache = new WeakMap) {
  const found = findExistingProxyOrObject(o, notifyParent, vls, refIds, cache)
  if (found) return found

  const orig = isArray(o) ? [] : create(getProto(o))

  const Vl = orig[_module] ? VersionListenerModule : VersionListener

  const vl = new Vl(orig, vls, snapCache)
  const proxy = new Proxy(orig, createHandler(vl.notify, vls, refIds, cache, snapCache))

  cache.set(o, proxy)
  vls.set(proxy, vl)

  if (notifyParent) vl.parents.add(notifyParent)

  Object.keys(o).forEach(k => {
    const v = o[k]
    orig[k] = canProxy(v) ? createProxy(v, vls, refIds, vl.notify, cache, snapCache) : v
  })

  return proxy
}



let highestVersion = 0


class VersionListener {
  version = highestVersion
  parents = new Set

  constructor(orig, vls, cache) {
    this.orig = orig
    this.vls = vls
    this.cache = cache

    this.notify = this.notify.bind(this) // needs unique ref with `this` context to be passed as callback to children
  }

  remove(notifyParent) {
    this.parents.delete(notifyParent)
    if (this.parents.size) return // proxy is assigned elsewhere and therefore has other parents
    Object.values(this.orig).forEach(v => this.vls.get(v)?.remove(this.notify)) // however, if no more parents, attempt to recursively remove parents from children if they also aren't assigned elsewhere
  }

  notify(version = ++highestVersion, branch) {
    if (this.version === version) return console.log('version match', this.orig)
    this.version = version
    this.parents.forEach(parent => parent(version, branch))
  }
}


class VersionListenerModule extends VersionListener {
  constructor(orig, vls, cache) {
    super(orig, vls, cache)

    this.respond = orig.respond
    this.branch = orig.respond.branch
    this.isTop = orig.moduleName === ''
  }

  notify(version = ++highestVersion, branch = this.branch) {
    super.notify(version, branch)
    if (this.isTop) queueNotification(branch, this.respond)
  }
}




const findExistingProxyOrObject = (po, notifyParent, vls, refIds, cache) => {
  const vl = vls.get(po)

  if (vl) {                          // proxy assigned that exists elsewhere
    vl.parents.add(notifyParent)

    if (!refIds.has(vl.orig)) {
      refIds.set(vl.orig, generateId())
    }

    return po
  }

  const proxy = cache.get(po)

  if (proxy) {                         // object assigned that exists somewhere else as a proxy
    const vl = vls.get(proxy)
    vl.parents.add(notifyParent)

    if (!refIds.has(po)) {
      refIds.set(po, generateId())
    }

    return proxy
  }
}


export const refIds = new WeakMap

const generateId = () => start++

let start = new Date().getTime() // use time as initial count instead of 0 to avoid collisions between new and existing references after refreshes (where sessionStorage restores old references)
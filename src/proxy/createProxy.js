import { canProxy, isArray, create, getProto } from './helpers/utils.js'
import createHandler from './helpers/createHandler.js'
import { _module, _top } from '../createModule/reserved.js'
import queueNotification from './helpers/queueNotification.js'


export default function createProxy(o, vls, refIds, notifyParent = function() {}, cache =  new WeakMap, snapCache = new WeakMap) {
  const found = findExistingProxyOrObject(o, notifyParent, vls, refIds, cache)
  if (found) return found

  const orig = isArray(o) ? [] : create(getProto(o))
  const VersionListener = o[_module] ? (o[_top] ? VLTop : VLModule) : VL

  const vl = new VersionListener(orig, vls, snapCache)
  const proxy = new Proxy(orig, createHandler(vl.notify, vls, refIds, cache, snapCache))

  cache.set(o, proxy)
  vls.set(proxy, vl)

  vl.parents.add(notifyParent)

  Object.keys(o).forEach(k => {
    const v = o[k]
    orig[k] = canProxy(v) ? createProxy(v, vls, refIds, vl.notify, cache, snapCache) : v
  })

  return proxy
}



let highestVersion = 0


class VL {
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
    if (this.parents.size) return // proxy is assigned elsewhere and therefore has other parents, and therefore must continue to live on in state
    Object.values(this.orig).forEach(v => this.vls.get(v)?.remove(this.notify)) // however, if no more parents, attempt to recursively remove parents from the children of removed proxy in case they also aren't assigned elsewhere -- note: recursion happens downward toward children via `remove` unlike `notify` which recurses upward toward ancestors; it will remove notifyParent from all posterity
  }

  notify(version = ++highestVersion, branch = this.branch) {
    if (this.version === version) return
    this.version = version
    this.parents.forEach(parent => parent(version, branch))
  }
}


class VLModule extends VL {
  constructor(orig, vls, cache) {
    super(orig, vls, cache)
    this.branch = orig.respond.branch
  }
}


class VLTop extends VL {
  constructor(orig, vls, cache) {
    super(orig, vls, cache)
    this.branch = orig.respond.branch
    this.respond = orig.respond
  }

  notify(version = ++highestVersion, branch = this.branch) {
    this.version = version
    queueNotification(branch, this.respond)
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
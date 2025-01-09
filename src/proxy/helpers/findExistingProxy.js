export default (po, vns, cache, refIds, notify) => {
  const vn = vns.get(po)             // po is proxy

  if (vn) {                          // proxy assigned that exists elsewhere (po is proxy)
    vn.parents.add(notify)

    if (!refIds.has(vn.obj)) {
      refIds.set(vn.obj, generateId())
    }

    return po
  }

  const proxy = cache.get(po)          // po is object

  if (proxy) {                         // object assigned that exists somewhere else as a proxy (po is object)
    const vn = vns.get(proxy)
    vn.parents.add(notify)

    if (!refIds.has(po)) {
      refIds.set(po, generateId())
    }

    return proxy
  }
}



const generateId = () => start++

let start = new Date().getTime() // use time as initial count instead of 0 to avoid collisions between new and existing references after refreshes (where sessionStorage restores old references)
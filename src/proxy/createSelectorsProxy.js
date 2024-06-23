import createSelectorsHandler from './utils/createSelectorsHandler.js'
import { getOriginalObject, isObject } from './utils/helpers.js'


export default (snapshot, store, parent, path = '') => {
  if (!isObject(snapshot)) return snapshot
  
  const target = getOriginalObject(snapshot)

  const hit = cache.get(target)
  if (hit) return hit

  const handler = createSelectorsHandler(store, parent, path)
  const proxy = new Proxy(target, handler)
  
  cache.set(target, proxy)

  return proxy
}


const cache = new WeakMap

/**
 * make valtio replacement work
 * make proxy application lazy based on snaps
 * see if findOne selector can be done via built-in support for getters -- or find other way to pre-apply models
 * put all of store + events in proxy state
 * replace 3 args with 2 args
 * refactor createStore
 * make respond support modular replacement of all key pillars within createStore
 * splitting + ssr
 */
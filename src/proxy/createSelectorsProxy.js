import createSelectorsHandler from './utils/createSelectorsHandler.js'
import { getOriginalObject } from './utils/helpers.js'


export default (snapshot, store, parent, path = '') => {
  const target = getOriginalObject(snapshot)

  const hit = cache.get(target)
  if (hit) return hit

  const handler = createSelectorsHandler(store, parent, path)
  const proxy = new Proxy(target, handler)
  
  cache.set(target, proxy)

  return proxy
}


const cache = new WeakMap
import createSelectorsHandler from './utils/createSelectorsHandler.js'


export default (snapshot, store, parent, path = '') => {
  const hit = cache.get(snapshot)
  if (hit) return hit

  const handler = createSelectorsHandler(store, parent, path)
  const proxy = new Proxy(snapshot, handler)
  
  cache.set(snapshot, proxy)

  return proxy
}


const cache = new WeakMap
import createSnapHandler from './utils/createSnapHandler.js'


export default (snap, parentState) => {
  const { affected, cache, callback, proxy } = parentState
  
  let state = cache.get(snap)

  if (!state) {
    state = { callback }
    state.proxy = new Proxy(snap, createSnapHandler(snap, state))
    cache.set(snap, state)
  }

  state.affected = affected
  state.cache = cache
  state.parentProxy = proxy

  return state.proxy
}
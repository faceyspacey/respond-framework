import createSnapHandler from './utils/createSnapHandler.js'


export default (snap, parentState) => {
  const { affected, cache, proxy } = parentState
  
  let state = cache.get(snap)

  if (!state) {
    state = { cache }
    state.proxy = new Proxy(snap, createSnapHandler(snap, state))
    cache.set(snap, state)
  }

  state.affected = affected
  state.parentProxy = proxy

  return state.proxy
}
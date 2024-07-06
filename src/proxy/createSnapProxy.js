import createSnapHandler from './utils/createSnapHandler.js'


export default (snap, store, parentState, path = '', moduleProxy, parentProxy) => {
  const { affected, cache, proxy: parent } = parentState

  let state = cache.get(snap)

  if (!state) {
    state = {}
    state.proxy = createSnapHandler(snap, state, store, parent, path, moduleProxy, parentProxy)
    cache.set(snap, state)
  }

  state.affected = affected
  state.cache = cache

  return state.proxy
}
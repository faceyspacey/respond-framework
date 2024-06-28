import createSnapHandler from './utils/createSnapHandler.js'


export default (snap, store, parentState, path = '') => {
  const { affected, cache, proxy: parent } = parentState

  let state = cache.get(snap)

  if (!state) {
    state = {}
    const handler = createSnapHandler(state, store, parent, path)
    state.proxy = new Proxy(snap, handler)
    cache.set(snap, state)
  }

  state.affected = affected
  state.cache = cache

  return state.proxy
}
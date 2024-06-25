import createSnapHandler from './utils/createSnapHandler.js'
import { getOriginalObject } from './utils/helpers.js'


export default (snapshot, store, parentState, path = '') => {
  const { affected, cache, proxy: parent } = parentState

  const target = getOriginalObject(snapshot)
  let state = cache.get(target)

  if (!state) {
    state = {}
    const handler = createSnapHandler(state, store, parent, path)
    state.proxy = new Proxy(target, handler)
    cache.set(target, state)
  }

  state.affected = affected
  state.cache = cache

  return state.proxy
}
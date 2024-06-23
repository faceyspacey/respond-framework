import createSnapHandler from './utils/createSnapHandler.js'
import { getOriginalObject, isObject } from './utils/helpers.js'


export default (snapshot, parentState, store, path = '') => {
  if (!isObject(snapshot)) return snapshot
  
  const { affected, cache, proxy: parent } = parentState

  const target = getOriginalObject(snapshot)
  let state = cache.get(target) ?? {}

  if (!state) {
    state = {}
    const handler = createSnapHandler(state, store, path, parent)
    state.proxy = new Proxy(target, handler)
    cache.set(target, state)
  }

  state.affected = affected
  state.cache = cache

  return state.proxy
}
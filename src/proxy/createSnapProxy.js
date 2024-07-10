import createSnapHandler from './utils/createSnapHandler.js'


export default (snap, store, parentState, path = '') => {
  const isModule = !!store.modulePaths[path]
  const { affected, cache, moduleProxy, parentProxy } = parentState
  
  let state = cache.get(snap)

  if (!state) {
    state = {}
    state.proxy = createSnapHandler(snap, state, store, isModule, path)
    cache.set(snap, state)
  }

  state.affected = affected
  state.cache = cache

  // parent module might have changed, while child module selector selected from parent module, but did not itself change
  // so child's get trap needs access to parent module
  state.parentProxy = isModule ? moduleProxy : parentProxy
  state.moduleProxy = isModule ? state.proxy : moduleProxy

  return state.proxy
}
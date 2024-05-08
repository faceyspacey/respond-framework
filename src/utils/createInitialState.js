import { sliceStoreByModulePath } from './sliceByModulePath.js'


export default function createInitialState(mod, store, modulePath = '') {
  return {
    ...(typeof mod.initialState === 'function' ? mod.initialState(sliceStoreByModulePath(store, modulePath)) : mod.initialState),
    ...recurseModules(mod, store, modulePath)
  }
}

const recurseModules = (mod, store, modulePath) => {
  if (!mod.modules) return

  return Object.keys(mod.modules).reduce((state, k) => {
    const child = mod.modules[k]
    const path = modulePath ? `${modulePath}.${k}` : k

    state[k] = createInitialState(child, store, path)
    return state
  }, {})
}

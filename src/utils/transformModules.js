export const createModulePaths = (mod, hash = {}, p = '') => { // store.modulePaths (to check if accessed state matches a module path)
  hash[p] = true

  mod.moduleKeys.forEach(k => {
    createModulePaths(mod[k], hash, p ? `${p}.${k}` : k)
  })

  return hash
}


export const createModulePathsById = (mod, hash = {}, p = '') => {
  if (!mod.id) throw new Error('respond: missing id on module: ' + p)

  hash[mod.id] = p
  mod.modulePath = p

  mod.moduleKeys.forEach(k => {
    createModulePathsById(mod[k], hash, p ? `${p}.${k}` : k)
  })

  return hash
}







// store.reducers

export const createReducers = (mod, moduleName, parent) => {
  const { reducers, props } = mod
  mod.reducers = { ...reducers }

  recurseModulesReducers(mod, mod.reducers)
  createReducerProps(parent, moduleName, props?.reducers)

  return mod.reducers
}


const recurseModulesReducers = (mod, parent) =>
  mod.moduleKeys.forEach(k => {
    const child = mod[k]
    parent[k] = createReducers(child, k, parent)
  })


const createReducerProps = (parent = {}, moduleName, reducers = {}) =>
  Object.keys(reducers).forEach(k => {
    const reducer = reducers[k]
    reducer.__prop = moduleName
    parent[k] = reducer
  })
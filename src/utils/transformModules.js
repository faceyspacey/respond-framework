export const createModulePathsById = topModule => {
  const id = topModule.id || '1'
  const mp = ''

  topModule.id = id
  topModule.modulePath = mp

  return createModulePathsByIdRecursive(topModule, mp, { [id]: mp })
}

const createModulePathsByIdRecursive = (mod, modulePath, modulePathsById) => {
  if (!mod.modules) return modulePathsById

  return Object.keys(mod.modules).reduce((acc, k) => {
    const child = mod.modules[k]
    const path = modulePath ? `${modulePath}.${k}` : k

    if (!child.id) {
      throw new Error('respond: missing id on module ' + path)
    }

    acc[child.id] = path
    child.modulePath = path

    return createModulePathsByIdRecursive(child, path, acc)
  }, modulePathsById)
}



// store.modulePaths (to check if accessed state matches a module path)

export const createModulePaths = (mod, modulePath = '', modulePaths = { ['']: true }) => {
  if (!mod.modules) return modulePaths

  return Object.keys(mod.modules).reduce((acc, k) => {
    const child = mod.modules[k]
    const path = modulePath ? `${modulePath}.${k}` : k

    acc[path] = true

    return createModulePaths(child, path, acc)
  }, modulePaths)
}






// store.reducers

export const createReducers = (mod, moduleName, parent) => {
  const { modules, reducers, props } = mod
  mod.reducers = { ...reducers }

  recurseModulesReducers(modules, mod.reducers)
  createReducerProps(parent, moduleName, props?.reducers)

  return mod.reducers
}


const recurseModulesReducers = (modules = {}, parent) =>
  Object.keys(modules).forEach(k => {
    const child = modules[k]
    parent[k] = createReducers(child, k, parent)
  })


const createReducerProps = (parent = {}, moduleName, reducers = {}) =>
  Object.keys(reducers).forEach(k => {
    const reducer = reducers[k]
    reducer.__prop = moduleName
    parent[k] = reducer
  })
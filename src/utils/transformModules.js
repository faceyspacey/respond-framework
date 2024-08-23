import mergeModels from '../db/utils/mergeModels.js'
import findOne from '../selectors/findOne.js'


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



// store.modulePaths (for valtio to simply + quickly check if accessed state matches a module path)

export const createModulePaths = (mod, modulePath = '', modulePaths = { ['']: true }) => {
  if (!mod.modules) return modulePaths

  return Object.keys(mod.modules).reduce((acc, k) => {
    const child = mod.modules[k]
    const path = modulePath ? `${modulePath}.${k}` : k

    acc[path] = true

    return createModulePaths(child, path, acc)
  }, modulePaths)
}



// store.selectors

export const createSelectors = (mod, topModuleOriginal) => {
  const topModels = !topModuleOriginal.db?.nested && mergeModels(topModuleOriginal.db?.models)
  return createModuleSelectors(mod, topModels)
}


const createModuleSelectors = (mod, topModels) => {
  const models = topModels || mergeModels(mod.db?.models)

  const selectors = {
    ...mod.selectors,
    ...mod.defaultProps?.selectors,
    ...recurseModulesSelectors(mod, topModels),
    findOne,
    models
  }

  if (mod.props?.selectors) {
    selectors.__props = mod.props.selectors
  }

  return selectors
}


const recurseModulesSelectors = (mod, topModels) => {
  if (!mod.modules) return

  return Object.keys(mod.modules).reduce((selectors, k) => {
    const child = mod.modules[k]
    selectors[k] = createModuleSelectors(child, topModels)
    return selectors
  }, {})
}



// store.reducers

export const createReducers = (mod, moduleName, parent) => {
  const reducers = {
    ...mod.reducers,
    ...mod.defaultProps?.reducers,
  }

  Object.assign(reducers, recurseModulesReducers(mod, reducers))

  if (mod.props?.reducers && parent) {
    Object.assign(parent, createReducerProps(mod.props.reducers, moduleName))
  }

  return reducers
}


const recurseModulesReducers = (mod, parent) => {
  if (!mod.modules) return

  return Object.keys(mod.modules).reduce((reducers, k) => {
    const child = mod.modules[k]
    reducers[k] = createReducers(child, k, parent)
    return reducers
  }, {})
}


const createReducerProps = (reducers, moduleName) => {
  if (!reducers) return

  Object.values(reducers).forEach(reducer => {
    reducer.__prop = moduleName
  })
  
  return reducers
}
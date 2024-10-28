export default function sliceByModulePath(obj, modulePath) {
  if (!modulePath) return obj
  if (!obj) return
  
  const modules = modulePath.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}



export const sliceEventByModulePath = (e, modulePath = e.modulePath) => {
  if (!modulePath) return e

  const type = stripModulePath(e.type, modulePath)
  const namespace = stripModulePath(e.namespace, modulePath)

  return { ...e, type, namespace }
}




export const stripModulePath = (type, modulePath) =>
  modulePath ? type.slice(modulePath.length + 1) : type


export const prependModulePath = (typeOrNamespace, modulePath) =>
  modulePath
    ? typeOrNamespace ? `${modulePath}.${typeOrNamespace}` : modulePath // type could be an empty string namespace
    : typeOrNamespace


export const prependModulePathToE = e => {
  const namespace = prependModulePath(e._namespace, e.modulePath)
  const type = namespace ? `${namespace}.${e._type}` : e._type

  return { ...e, type, namespace }
}


export const recreateFullType = (e, modulePath = e.modulePath) => {
  const namespace = prependModulePath(e._namespace, modulePath)
  return namespace ? `${namespace}.${e._type}` : e._type
}




export const traverseModuleChildren = (state, callback) => {
  for (const k of state.moduleKeys) {
    callback(state[k], state)
    traverseModuleChildren(state[k], callback)
  }
}


export const traverseModules = (state, callback, parent) => {
  callback(state, parent)

  for (const k of state.moduleKeys) {
    traverseModules(state[k], callback, state)
  }
}


export const traverseModulesDepthFirst = (state, callback, parent) => {
  for (const k of state.moduleKeys) {
    traverseModules(state[k], callback, state)
  }

  callback(state, parent)
}

export const traverseModulesAsync = async (state, callback) => {
  await callback(state)

  for (const k of state.moduleKeys) {
    await traverseModulesAsync(state[k], callback)
  }
}


export const traverseModulesAsyncParallel = (top, callback) => {
  const promises = []

  traverseModules(top, state => {
    const promise = callback(state)
    promises.push(promise)
  })

  return Promise.all(promises)
}
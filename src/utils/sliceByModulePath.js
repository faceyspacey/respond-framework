export default function sliceByModulePath(obj, modulePath) {
  if (!modulePath) return obj
  if (!obj) return
  
  const modules = modulePath.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}



export const sliceEventByModulePath = (e, modulePath = e.modulePath) => {
  if (!modulePath) return e

  const type = stripPath(modulePath, e.type)
  const namespace = stripPath(modulePath, e.namespace)

  return { ...e, type, namespace }
}




export const stripPath = (a, b) =>
  a ? b.replace(new RegExp(`^${a}\.?`), '') : b



export const prependPath = (a = '', b = '') =>
  a
    ? b ? `${a}.${b}` : a
    : b


export const prependModulePathToE = e => {
  const namespace = prependPath(e.modulePath, e._namespace)
  const type = namespace ? `${namespace}.${e._type}` : e._type

  return { ...e, type, namespace }
}


export const recreateFullType = (e, modulePath = e.modulePath) => {
  const namespace = prependPath(modulePath, e._namespace)
  return namespace ? `${namespace}.${e._type}` : e._type
}



export const nestAtModulePath = (slice, modulePath, value) => {
  if (modulePath) {
    const modules = modulePath.split('.')

    for (const k of modules) {
      slice = slice[k] ?? (slice[k] = {})
    }
  }

  return Object.assign(slice, value)
}



export const traverseModuleChildren = (state, callback) => {
  for (const k of state.moduleKeys) {
    callback(state[k], state)
    traverseModuleChildren(state[k], callback)
  }
}


export const traverseModules = (state, callback, parent, p = '') => {
  callback(state, parent, p)

  for (const k of state.moduleKeys) {
    traverseModules(state[k], callback, state, p ? `${p}.${k}` : k)
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
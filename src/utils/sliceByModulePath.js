export default function sliceByModulePath(obj, branch) {
  if (!branch) return obj
  if (!obj) return
  
  const modules = branch.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}



export const sliceEventByModulePath = (e, branch = e.branch) => {
  if (!branch) return e

  const type = stripPath(branch, e.type)
  const namespace = stripPath(branch, e.namespace)

  return { ...e, type, namespace }
}




export const stripPath = (a, b) =>
  a ? b.replace(new RegExp(`^${a}\.?`), '') : b

export const stripPathDir = (a, b) =>
  a ? b.replace(new RegExp(`^${a.replace(/\./, '/')}\/?`), '') : b



export const prependPath = (a = '', b = '') =>
  a
    ? b ? `${a}.${b}` : a
    : b


export const prependModulePathToE = e => {
  const namespace = prependPath(e.branch, e._namespace)
  const type = namespace ? `${namespace}.${e._type}` : e._type

  return { ...e, type, namespace }
}


export const recreateFullType = (e, branch = e.branch) => {
  const namespace = prependPath(branch, e._namespace)
  return namespace ? `${namespace}.${e._type}` : e._type
}



export const nestAtModulePath = (branch, value, top = {}) => {
  let slice = top
  
  if (branch) {
    const modules = branch.split('.')

    for (const k of modules) {
      slice = slice[k] ?? (slice[k] = {})
    }
  }

  Object.assign(slice, value)

  return top
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


export const stateForNormalizedPath = (state, p) => {
  const { modulePaths, focusedModulePath: fmp } = state.respond
  const isDescendentOrFocusedTop = p.indexOf(fmp) === 0
  return isDescendentOrFocusedTop && modulePaths[stripPath(fmp, p)] // there might be no state to assign state.respond.replays, as traversal to top was only required to gather all settings
}
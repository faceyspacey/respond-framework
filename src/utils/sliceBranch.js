export default function sliceBranch(obj, branch) {
  if (!branch) return obj
  if (!obj) return
  
  const modules = branch.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}



export const sliceEventByBranch = (e, branch = e.branch) => {
  if (!branch) return e

  const type = stripBranch(branch, e.type)
  const namespace = stripBranch(branch, e.namespace)

  return { ...e, type, namespace }
}




export const stripBranch = (a, b) =>
  a ? b.replace(new RegExp(`^${a}\.?`), '') : b

export const stripBranchDir = (a, b) =>
  a ? b.replace(new RegExp(`^${a.replace(/\./, '/')}\/?`), '') : b



export const prependBranch = (a = '', b = '') =>
  a
    ? b ? `${a}.${b}` : a
    : b



export const stripBranchIfAvailable = (a, b) =>
  a ? b.indexOf(a) === 0 && stripBranch(a, b) : b // caller can do something else falsy


export const prependBranchToE = e => {
  const namespace = prependBranch(e.branch, e._namespace)
  const type = namespace ? `${namespace}.${e._type}` : e._type

  return { ...e, type, namespace }
}


export const recreateFullType = (e, branch = e.branch) => {
  const namespace = prependBranch(branch, e._namespace)
  return namespace ? `${namespace}.${e._type}` : e._type
}



export const nestAtBranch = (branch, value, top = {}) => {
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


export const traverseModules = (state, callback, parent, b = '') => {
  callback(state, parent, b)

  for (const k of state.moduleKeys) {
    traverseModules(state[k], callback, state, b ? `${b}.${k}` : k)
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
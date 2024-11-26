export default function sliceBranch(obj, branch) {
  if (!branch || !obj) return obj
  const modules = branch.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}



export const strip = (a, b) =>                    // 'admin', 'admin.foo' or 'admin', 'admin'
  a ? b.replace(new RegExp(`^${a}\.?`), '') : b   // 'foo'                   ''

export const prepend = (a = '', b = '') =>
  a
    ? b ? `${a}.${b}` : a
    : b

    
export const stripBranchWithUnknownFallback = (a, b) =>
  a
    ? b.indexOf(a) === 0  // a is parent of b
      ? strip(a, b)
      : 'unknown.' + b
    : b 



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
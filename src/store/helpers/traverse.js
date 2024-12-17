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


export const traverseModulesAsyncParallel = (top, callback) => {
  const promises = []

  traverseModules(top, state => {
    const promise = callback(state)
    promises.push(promise)
  })

  return Promise.all(promises)
}
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
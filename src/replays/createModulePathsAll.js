
import { isModule } from '../store/reserved.js'


export default function createModulePathsAll(mod, paths = [], p = '') {
  mod[isModule] = true
  mod.moduleKeys = []
  mod.moduleKeysUser = []
  mod.modulePath = p

  paths.push(p)

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (isMod) {
      mod.moduleKeys.push(k)
      mod.moduleKeysUser.push(k)
      createModulePathsAll(v, paths, p ? `${p}.${k}` : k)
    }
  })

  return paths
}
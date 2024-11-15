
import { isModule } from '../store/reserved.js'
import { stripBranchIfAvailable } from '../utils/sliceBranch.js'


export default function createBranchesAll(mod, focusedBranch, paths = [], b = '') {
  mod[isModule] = true
  mod.moduleKeys = []
  mod.moduleKeysUser = []
  mod.branch = b
  mod.branchRelative = stripBranchIfAvailable(focusedBranch, b) ?? 'unknown.' + b

  paths.push(b)

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (isMod) {
      mod.moduleKeys.push(k)
      mod.moduleKeysUser.push(k)
      createBranchesAll(v, focusedBranch, paths, b ? `${b}.${k}` : k)
    }
  })

  return paths
}
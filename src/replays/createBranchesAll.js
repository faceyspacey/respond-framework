
import { isModule } from '../store/reserved.js'
import { stripBranchIfAvailable } from '../utils/sliceBranch.js'


export default function createBranchesAll(mod, focusedBranch, branchesAll = [], b = '') {
  mod[isModule] = true
  mod.moduleKeys = []
  
  mod.branchAbsolute = b
  mod.branch = stripBranchIfAvailable(focusedBranch, b) ?? 'unknown.' + b

  branchesAll.push(b)

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (!isMod) return

    mod.moduleKeys.push(k)
    createBranchesAll(v, focusedBranch, branchesAll, b ? `${b}.${k}` : k)
  })

  return branchesAll
}
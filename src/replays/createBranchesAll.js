
import { isModule } from '../store/reserved.js'
import { stripBranchIfAvailable } from '../utils/sliceBranch.js'


export default function createBranchesAll(mod, focusedBranch, branches = [], b = '') {
  mod[isModule] = true
  mod.moduleKeys = []
  
  mod.branch = b
  mod.branchRelative = stripBranchIfAvailable(focusedBranch, b) ?? 'unknown.' + b

  branches.push(b)

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (!isMod) return

    mod.moduleKeys.push(k)
    createBranchesAll(v, focusedBranch, branches, b ? `${b}.${k}` : k)
  })

  return branches
}
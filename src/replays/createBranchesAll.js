
import { isModule } from '../store/reserved.js'
import { stripBranchWithUnknownFallback } from '../utils/sliceBranch.js'


export default function createBranchesAll(mod, focusedBranch, branchesAll = [], b = '') {
  const ancestorOrChild = focusedBranch.indexOf(b) === 0 || b.indexOf(focusedBranch) === 0
  if (!ancestorOrChild) return

  mod[isModule] = true
  mod.moduleKeys = []
  
  mod.branchAbsolute = b
  mod.branch = stripBranchWithUnknownFallback(focusedBranch, b) // ancestor branches of focused branch will be prefixed with '.unknown'

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
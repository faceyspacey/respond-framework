
import { isModule } from '../store/reserved.js'
import { isDev, isTest } from '../utils.js'
import { stripBranchWithUnknownFallback } from '../utils/sliceBranch.js'
import * as replayToolsModule from '../modules/replayTools/index.js'


export default function createBranches(mod, focusedBranch, branches = [], b = '') {
  // const ancestorOrChild = focusedBranch.indexOf(b) === 0 || b.indexOf(focusedBranch) === 0
  // if (!ancestorOrChild) return

  mod[isModule] = true
  mod.moduleKeys = []
  
  mod.branchAbsolute = b
  mod.branch = stripBranchWithUnknownFallback(focusedBranch, b) // ancestor branches of focused branch will be prefixed with '.unknown'

  branches.push(b)

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (!isMod) return

    mod.moduleKeys.push(k)
    createBranches(v, focusedBranch, branches, b ? `${b}.${k}` : k)
  })

  if (b === focusedBranch && isDev && !isTest) {
    mod.replayTools = replayToolsModule
    mod.moduleKeys.push('replayTools')
    createBranches(replayToolsModule, focusedBranch, branches, 'replayTools')
  }

  return branches
}
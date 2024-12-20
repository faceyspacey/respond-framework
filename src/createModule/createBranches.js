import { _module } from './reserved.js'
import { isDev, isTest } from '../helpers/constants.js'
import { prepend, stripBranchWithUnknownFallback } from './helpers/sliceBranch.js'
import * as replayToolsModule from '../modules/replayTools/index.js'


export default function createBranches(mod, focusedBranch, branchNames = [], b = '') {
  mod[_module] = true
  mod.moduleKeys = []
  
  mod.branchAbsolute = b
  mod.branch = stripBranchWithUnknownFallback(focusedBranch, b) // ancestor branches of focused branch will be prefixed with '.unknown'

  branchNames.push(b)

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (!isMod) return

    mod.moduleKeys.push(k)
    createBranches(v, focusedBranch, branchNames, b ? `${b}.${k}` : k)
  })

  if (b === focusedBranch && isDev) { // put replayTools as child of focused branch
    mod.replayTools = replayToolsModule
    mod.moduleKeys.push('replayTools')
    createBranches(replayToolsModule, focusedBranch, branchNames, prepend(focusedBranch, 'replayTools'))
  }

  return branchNames
}
import getSystemState from '../utils/getSystemState.js'
import createRespond from './api/index.js'
import addModule from './addModules.js'
import createBranches from '../replays/createBranches.js'
import hydrateModules from './hydrateModules.js'
import sliceBranch from '../utils/sliceBranch.js'


export default (top, opts = {}, start = performance.now()) => {
  const system = getSystemState(opts)
  const focusedBranch = system.replayState.branch

  const branches = createBranches(top, focusedBranch)
  const mod = sliceBranch(top, focusedBranch)

  const Respond = createRespond(top, system, branches, mod)
  const state = addModule(Respond, mod)

  hydrateModules(state, system)

  console.log('createModule', parseFloat((performance.now() - start).toFixed(3)))
  return window.state = state
}
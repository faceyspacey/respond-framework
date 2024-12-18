import getSystemState from './getSystemState.js'
import createRespond from './createRespond.js'
import addModule from './addModule.js'
import hydrateModules from './hydrateModules.js'
import sliceBranch from './helpers/sliceBranch.js'


export default (top, opts = {}, start = performance.now()) => {
  const system = getSystemState(opts)
  const focusedBranch = system.replayState.branch

  const mod = sliceBranch(top, focusedBranch)

  const Respond = createRespond(top, system, mod, focusedBranch)
  const state = addModule(Respond, mod)

  hydrateModules(state, system)

  console.log('createModule', parseFloat((performance.now() - start).toFixed(3)))
  return window.state = state
}
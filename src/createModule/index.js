import getSystemState from './getSystemState.js'
import createRespond from './createRespond.js'
import addModule from './addModule.js'
import hydrateModules from './hydrateModules.js'
import sliceBranch from './helpers/sliceBranch.js'
import { isTest } from '../helpers/constants.js'


export default (top, opts = {}, start = performance.now()) => {
  const system = getSystemState(opts)
  const focusedBranch = system.replayState.branch

  const mod = sliceBranch(top, focusedBranch)

  const Respond = createRespond(top, system, mod, focusedBranch, opts)
  const state = addModule(Respond, mod)

  hydrateModules(state, system)

  if (!isTest) console.log('createModule', parseFloat((performance.now() - start).toFixed(3)))
  window.state = state
  return state.respond
}
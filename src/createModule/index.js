import getSystemState from './getSystemState.js'
import createRespond from './createRespond.js'
import addModule from './addModule.js'
import hydrateModules from './hydrateModules.js'
import sliceBranch from './helpers/sliceBranch.js'
import { isTest } from '../helpers/constants.js'


export default (top, opts = {}, start = performance.now()) => {
  const system = getSystemState(opts)
  const mod = sliceBranch(top, system.replayState.branch)

  const Respond = createRespond(top, system, mod, opts)
  const state = addModule(mod, Respond)

  hydrateModules(state, system)

  if (!isTest) console.log('createModule!', parseFloat((performance.now() - start).toFixed(3)))
  window.state = state
  return state.respond
}
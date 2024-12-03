import sessionState from '../utils/sessionState.js'
import createRespond from './api/index.js'
import addModule from './addModules.js'
import createBranches from '../replays/createBranches.js'
import hydrateModules from './hydrateModules.js'
import sliceBranch from '../utils/sliceBranch.js'


export default (top, opts = {}) => {
  const session = sessionState(opts)
  const focusedBranch = session.replayState.branch

  const branches = createBranches(top, focusedBranch)
  const mod = sliceBranch(top, focusedBranch)

  const Respond = createRespond(top, session, branches, mod)
  const state = addModule(Respond, mod)

  hydrateModules(state, session)

  return window.state = state
}
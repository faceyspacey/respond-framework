import sessionState from '../utils/sessionState.js'
import createRespond from './api/index.js'
import addModule from './addModules.js'
import createBranches from '../replays/createBranches.js'
import createReplays from '../replays/index.js'
import hydrateModules from './hydrateModules.js'
import sliceBranch from '../utils/sliceBranch.js'


export default (top, opts = {}) => {
  const session = sessionState(opts)
  const focusedBranch = session.replayState.branch

  const branches = createBranches(top, focusedBranch)
  const focused = sliceBranch(top, focusedBranch)

  const Respond = createRespond(top, session, branches, focused)
  const state = addModule(Respond, focused)

  createReplays(Respond, state, session)
  hydrateModules(state, session)

  return window.state = state
}
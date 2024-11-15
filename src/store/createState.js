import sessionState from '../utils/sessionState.js'

import createProxy from '../proxy/createProxy.js'
import createRespond from './api/index.js'

import sliceBranch from '../utils/sliceBranch.js'

import addModule from './addModules.js'
import createReplays from '../replays/index.js'
import hydrateModules from './hydrateModules.js'


export default (top, opts = {}) => {
  const session = sessionState(opts)
  const focusedBranch = session.replayState.focusedBranch ?? ''

  const state = createProxy(Object.create({}))
  const respond = createRespond(top, state, focusedBranch)

  const mod = sliceBranch(top, focusedBranch)

  addModule(mod, respond, state, session)
  createReplays(state, session)
  hydrateModules(state, session)

  return window.state = state
}
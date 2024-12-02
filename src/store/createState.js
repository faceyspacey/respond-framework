import sessionState from '../utils/sessionState.js'
import createRespond from './api/index.js'
import addModule from './addModules.js'
import createReplays from '../replays/index.js'
import hydrateModules from './hydrateModules.js'


export default (top, opts = {}) => {
  const session = sessionState(opts)
  const Respond = createRespond(top, session)
  const state = addModule(Respond, Respond.prototype.focusedModule)

  createReplays(Respond, state, session)
  hydrateModules(state, session)

  return window.state = state
}
import sessionState from '../utils/sessionState.js'
import createRespond from './api/index.js'
import addModule from './addModules.js'
import createReplays from '../replays/index.js'
import hydrateModules from './hydrateModules.js'


export default (top, opts = {}) => {
  const session = sessionState(opts)

  const state = Object.create({})
  const respond = createRespond(top, state, session)

  addModule(respond, respond.focusedModule, state)
  createReplays(state, session)

  return window.state = hydrateModules(state, session)
}
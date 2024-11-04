import getSessionState from '../utils/getSessionState.js'

import createProxy from '../proxy/createProxy.js'
import createRespond from './api/index.js'

import sliceByModulePath from '../utils/sliceByModulePath.js'

import addModule from './addModules.js'
import createReplays from '../replays/index.js'
import hydrateModules from './hydrateModules.js'


export default (top, opts = {}) => {
  const session = getSessionState(opts)
  const focusedPath = session.replaySettings.module ?? ''

  const state = createProxy(Object.create({}))
  const respond = createRespond(top, state, focusedPath)

  const mod = sliceByModulePath(top, focusedPath)

  addModule(mod, respond, state, session)
  createReplays(state, session, focusedPath)
  hydrateModules(state, session)

  return window.store = window.state = state
}
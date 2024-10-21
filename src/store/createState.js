import createProxy from '../proxy/createProxy.js'
import addModule from './addModules.js'
import createRespond from './api/index.js'

import createReplays from '../replays/index.js'

import sliceByModulePath from '../utils/sliceByModulePath.js'
import { hydrateModules } from './mergeModules.js'
import reduce from './plugins/reduce.js'


export default async (top, opts = {}) => {
  const state = createProxy(Object.create({}))

  const replays = await createReplays(top, opts, state)
  const respond = createRespond(top, state, replays)
  const mod = sliceByModulePath(top, replays.settings.modulePath)

  await addModule(mod, respond, state)
  
  hydrateModules(state, replays)

  if (replays.status !== 'hmr') reduce(state, state.events.start())

  return window.store = window.state = state
}
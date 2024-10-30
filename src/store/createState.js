import createProxy from '../proxy/createProxy.js'
import createReplays from '../replays/index.js'
import createRespond from './api/index.js'

import sliceByModulePath from '../utils/sliceByModulePath.js'
import addModule from './addModules.js'

import { hydrateModules } from './mergeModules.js'
import loadPlugins from '../utils/loadPlugins.js'


export default async (top, opts = {}) => {
  const state = createProxy(Object.create({}))
  const replays = await createReplays(top, opts, state)
  const respond = createRespond(top, state, replays)

  const mod = sliceByModulePath(top, replays.settings.module)
  
  await addModule(mod, respond, state)
  await hydrateModules(state, replays)
  await loadPlugins(state)

  return window.store = window.state = state
}
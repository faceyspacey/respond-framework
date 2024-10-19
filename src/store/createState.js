import createProxy from '../proxy/createProxy.js'
import addModule from './addModules.js'
import createRespond from './api/index.js'

import createReplays from '../replays/index.js'

import createHistory from '../history/index.js'
import createCache from '../utils/createCache.js'

import createDevtools from '../devtools/index.mock.js'

import sliceByModulePath from '../utils/sliceByModulePath.js'
import { hydrateModules } from './mergeModules.js'
import reduce from './plugins/reduce.js'


export default async (top, opts = {}) => {
  const state = createProxy(Object.create({}))

  const replays = await createReplays(top, opts)
  
  const history = createHistory()
  const cache = createCache(state)
  const devtools = createDevtools()

  const respond = createRespond(state, modulePath, { top, replays, history, cache, devtools })
  
  const mod = sliceByModulePath(top, replays.settings.modulePath)
  await addModule(mod, respond, state)
  
  hydrateModules(state, replays)

  if (!replays.hmr) reduce(state, state.events.start())

  return window.store = window.state = replays.store = state
}
import createProxy from '../proxy/createProxy.js'
import addModules from './addModules.js'
import createRespond, { getStatus, findInClosestAncestor } from './api/index.js'

import createCookies from '../cookies/index.js'
import createReplays from '../replays/index.js'

import createHistory from '../history/index.js'
import createCache from '../utils/createCache.js'

import createDevtools from '../devtools/index.mock.js'

import restoreSettings from '../replays/helpers/restoreSettings.js'
import sliceByModulePath from '../utils/sliceByModulePath.js'
import { mergeModulesPrevState } from './mergeModules.js'
import reduce from './plugins/reduce.js'


export default async (topModule, opts = {}) => {
  const state = createProxy(Object.create({}))

  const replays = await createReplays(topModule, opts)

  const mod = sliceByModulePath(topModule, replays.settings.modulePath)

  const history = createHistory()
  const cache = createCache(state)
  const devtools = createDevtools()

  const ctx = { ...window.store?.ctx, init: true }

  const respond = createRespond(state, modulePath, { ctx, topModule, replays, history, cache, devtools })
  
  await addModules(mod, respond, state, opts.hydration, replays, window.store)
  
  if (!replays.hmr) {
    mergeModulesPrevState(state, respond.snapshot(state))
    reduce(state, state.events.start())
  }

  return window.store = window.state = replays.store = state
}
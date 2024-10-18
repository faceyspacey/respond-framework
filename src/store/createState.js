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


export default async (topModule, { settings: rawSettings, hydration } = {}) => {
  const proto = {}
  const state = createProxy(Object.create(proto))

  const settings = rawSettings ?? await restoreSettings()
  const { prevStore, replay, hmr, modulePath } = getStatus(rawSettings, settings)

  const mod = sliceByModulePath(topModule, modulePath)
  
  const topCookies = mod.cookies ?? findInClosestAncestor('cookies', modulePath, topModule)
  const topReplays = mod.replays ?? findInClosestAncestor('replays', modulePath, topModule)

  const cookies = createCookies(topCookies)
  const replays = createReplays({ ...topReplays, replay, settings: { ...settings, token: await cookies.get('token') } })

  const history = createHistory()
  const cache = createCache(state)
  
  const devtools = createDevtools()

  const madeFirst = hmr ? prevStore?.ctx.madeFirst : false
  const ctx = { ...prevStore?.ctx, init: true, madeFirst }

  const respond = createRespond(state, modulePath, { ctx, topModule, cookies, replays, history, cache, devtools })
  
  await addModules(mod, respond, proto, state, hmr, hydration, replays, prevStore)
  
  if (!hmr) {
    mergeModulesPrevState(state, respond.snapshot(state))
    reduce(state, state.events.start())
  }

  return window.store = replays.store = state
}
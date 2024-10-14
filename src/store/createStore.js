import createProxy from '../proxy/createProxy.js'
import addModules from './addModules.js'
import api from './api/index.js'

import createCookies from '../cookies/index.js'
import createReplays from '../replays/index.js'
import createOptions from './createOptions.js'

import createHistory from '../history/index.js'
import createCache from '../utils/createCache.js'
import createDevtools from '../devtools/index.mock.js'

import restoreSettings from '../replays/helpers/restoreSettings.js'
import sliceByModulePath from '../utils/sliceByModulePath.js'
import { mergeModulesPrevState } from './mergeModules.js'


export default async (topModule, { settings: rawSettings, hydration } = {}) => {
  const proto = {}
  const state = createProxy(Object.create(proto))

  const settings = rawSettings ?? await restoreSettings()
  const { prevStore, replay, hmr, modulePath } = api.getStatus(rawSettings, settings)

  const mod = sliceByModulePath(topModule, modulePath)
  
  const topCookies = mod.cookies ?? api.findInClosestParent('cookies', topModule, modulePath)
  const topReplays = mod.replays ?? api.findInClosestParent('replays', topModule, modulePath)
  const topOptions = mod.options ?? api.findInClosestParent('options', topModule, modulePath)

  const cookies = createCookies(topCookies)
  const replays = createReplays({ ...topReplays, replay, settings: { ...settings, token: await cookies.get('token') } })
  const options = createOptions(topOptions)

  const history = createHistory(mod)
  const cache = createCache(state, options.cache)
  const devtools = createDevtools()

  const madeFirst = hmr ? prevStore?.ctx.madeFirst : false
  const ctx = { ...prevStore?.ctx, init: true, madeFirst }

  const respond = { ...options.merge, ...api, ctx, topModule, cookies, replays, options, history, cache, devtools, getStore: () => state }
  
  await addModules(mod, respond, proto, state, hmr, hydration, replays, prevStore)
  
  if (!hmr) {
    mergeModulesPrevState(state, api.snapshot(state))
    api.reduce(state, state.events.start())
  }

  return window.store = replays.store = state
}
import createReplayTools from '../replays/index.js'
import createDevTools from '../devtools/index.js'
import createDevtoolsMock from '../devtools/index.mock.js'
import createClientDatabase from '../db/createClientDatabase.js'
import createDispatch from './createDispatch.js'
import createDispatchSync from './createDispatchSync.js'
import createEvents from './createEvents.js'
import createFromEvent from '../utils/createFromEvent.js'
import createEventFrom from '../utils/createEventFrom.js'
import createCache from '../utils/createCache.js'
import createCookies from '../cookies/index.js'
import createHistoryDefault from '../history/index.js'
import snapshot from '../proxy/snapshot.js'
import createProxy from '../proxy/createProxy.js'
import shouldUseDevtools from '../utils/shouldUseDevtools.js'
import reduce from './plugins/reduce.js'
import { addToCache, addToCacheDeep } from '../utils/addToCache.js'
import { replacer, createReviver } from '../utils/jsonReplacerReviver.js'
import sliceByModulePath from '../utils/sliceByModulePath.js'
import { createModulePaths, createModulePathsById } from '../utils/createModulePaths.js'
import defaultPlugins from './plugins/index.js'
import defaultPluginsSync from './pluginsSync/index.js'
import getSessionState from '../utils/getSessionState.js'
import createInitialState from '../utils/createInitialState.js'
import * as replayTools from '../modules/replayTools/index.js'
import displaySelectorsInDevtools from './utils/displaySelectorsInDevtools.js'
import restoreSettings from '../replays/helpers/restoreSettings.js'
import render from '../react/render.js'
import { isProd, isDev, isTest } from '../utils/bools.js'
import createDbProxy from '../db/utils/createDbProxy.js'
import onError from './utils/onError.js'
import { subscribe, notify } from './utils/subscribe.js'



export default async (topModuleOriginal, settings) => {
  const replay = !!settings && !isProd
  settings ??= await restoreSettings()

  const modulePath = settings?.module || ''
  const topModule = !modulePath ? topModuleOriginal : sliceByModulePath(topModuleOriginal, modulePath)

  topModule.id ??= '1'
  delete topModule.props // props passed from parent are not available when using replayTools to focus child modules

  if (!isProd || options.productionReplayTools) {
    topModule.replayTools = replayTools
  }

  saveModuleKeys(topModuleOriginal)

  // inherit from topModuleOriginal if not available on selected topModule
  const topReplays = topModule.replays || topModuleOriginal.replays
  const topOptions = topModule.options || topModuleOriginal.options

  const cookies = topModule.cookies || createCookies()
  const token = cookies.token || await cookies.get('token')

  const replays = createReplayTools({ ...topReplays, settings: { ...settings, token }, replay })
  
  const options = {
    merge: {},
    defaultPlugins,
    defaultPluginsSync,
    createHistory: createHistoryDefault,
    ...topOptions,
    displaySelectorsInDevtools: displaySelectorsInDevtools(topOptions),
  }

  const getStore = () => state

  const db = createClientDatabase(topModule, topModuleOriginal)

  const prevStore = window.store
  const isHMR = !!prevStore && !replays.replay

  const modulePathsAll = createModulePaths(topModuleOriginal)
  const modulePaths = createModulePaths(topModule)
  const modulePathsById = createModulePathsById(topModule)
  
  const eventsAll = createEvents(topModuleOriginal, getStore)
  const events = !modulePath ? eventsAll : createEvents(topModule, getStore)

  const eventFrom = createEventFrom(getStore, events)
  const fromEvent = createFromEvent(getStore)

  const dispatch = createDispatch(getStore)
  const dispatchSync = createDispatchSync(getStore)

  const devtools = createDevtoolsMock() // shouldUseDevtools(options) ? createDevTools(initialState) : createDevtoolsMock()
  const history = options.createHistory(topModule)

  const cache = createCache(getStore, options.cache)

  const stringifyState = st => JSON.stringify(snapshot(st || state), replacer)
  const parseJsonState = json => JSON.parse(json, createReviver(state.events))

  const replaceState = next => { Object.keys(state).forEach(k => delete state[k]); Object.assign(state, next); }

  const shouldAwait = () => window.isFastReplay || process.env.NODE_ENV === 'test'
  const awaitInReplaysOnly = async f => shouldAwait() ? await f() : state.promises.push(f())

  const isEqualNavigations = (a, b) => a && b && fromEvent(a).url === fromEvent(b).url
  const getProxy = orig => proxyCache.proxy.get(orig) ?? orig

  const api = { ...options.merge, ctx: { init: true }, listeners: [], promises: [], refs: {}, modulePath: '', getProxy, topModule, topModuleOriginal, modulePathsAll, modulePaths, modulePathsById, options, events, eventsAll, cookies, replays, devtools, history, render, onError, snapshot, dispatch, dispatchSync, snapshot, awaitInReplaysOnly, shouldAwait, cache, reduce, subscribe, notify, replaceState, eventFrom, fromEvent, isEqualNavigations, addToCache, addToCacheDeep, getStore, onError, stringifyState, parseJsonState }
  
  const initialState = isHMR ? snapshot(prevStore.state) : await createInitialState(topModule, api, events, db, replays.token)

  const proxyCache = { proxy: new WeakMap, snap: new WeakMap }

  const state  = createProxy(initialState, undefined, proxyCache)
  state.prevState = isHMR ? prevStore.prevState : snapshot(state)

  if (!isHMR) reduce(state, state.events.start(undefined, { trigger: true }), true)

  db.store = state
  replays.store = state

  return window.store = state
}



const saveModuleKeys = mod => {
  mod.moduleKeys = Object.keys(mod).reduce((acc, k) => {
    child = mod[k]

    if (child?.module === true) {
      acc.push(k)
      saveModuleKeys(child)
    }

    return acc
  }, [])
}

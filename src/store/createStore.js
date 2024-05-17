import createReplayTools from '../replays/index.js'
import createDevTools from '../devtools/index.js'
import createDevtoolsMock from '../devtools/index.mock.js'
import createClientDatabase from '../db/createClientDatabase.js'
import createLazyModulesGetterProxy from '../valtio/createLazyModulesGetterProxy.js'
import createDispatch from './createDispatch.js'
import createDispatchSync from './createDispatchSync.js'
import createEvents from './createEvents.js'
import createFromEvent from '../utils/createFromEvent.js'
import createEventFrom from '../utils/createEventFrom.js'
import createCache from '../utils/createCache.js'
import createCookies from '../cookies/index.js'
import shouldUseDevtools from '../utils/shouldUseDevtools.js'
import reduce from './plugins/reduce.js'
import { addToCache, addToCacheDeep } from '../utils/addToCache.js'
import { proxy, snapshot } from '../valtio/vanilla.js'
import { setupHistory, exitBack, exitForward, disableForwardButton, createLinkOut } from '../utils/browserHistory.js'
import { replacer, createReviver } from '../utils/jsonReplacerReviver.js'
import { sliceEventByModulePath, sliceModuleByModulePath, sliceStoreByModulePath } from '../utils/sliceByModulePath.js'
import { createModulePathsById, createModulePaths, createReducers, createSelectors } from '../utils/transformModules.js'
import defaultPlugins from './plugins/index.js'
import defaultPluginsSync from './pluginsSync/index.js'
import getSessionState from '../utils/getSessionState.js'
import createInitialState from '../utils/createInitialState.js'
import * as replayTools from '../modules/replayTools/index.js'
import displaySelectorsInDevtools from './utils/displaySelectorsInDevtools.js'
import restoreSettings from '../replays/helpers/restoreSettings.js'
import render from '../react/render.js'
import { isProd } from '../utils/bools.js'


export default async (topModuleOriginal, settings) => {
  const replay = !!settings
  settings ??= await restoreSettings()

  const modulePath = settings?.module || ''
  const topModule = !modulePath ? topModuleOriginal : Object.assign({}, sliceModuleByModulePath(topModuleOriginal, modulePath))

  const topReplays = topModule.replays || topModuleOriginal.replays
  const topOptions = topModule.options || topModuleOriginal.options

  topModule.models ??= topModuleOriginal.models // allow child modules to inherit parent models

  const replays = createReplayTools({ ...topReplays, settings, replay })
  
  delete topModule.props // props passed from parent are not available when using replayTools to focus child modules
  
  const options = {
    merge: {},
    defaultPlugins,
    defaultPluginsSync,
    ...topOptions,
    displaySelectorsInDevtools: displaySelectorsInDevtools(topOptions),
  }

  const { merge } = options
  
  const cookies = topModule.cookies || createCookies()
  const db = createClientDatabase(topModule)

  topModule.modules = !isProd || options.productionReplayTools ? { ...topModule.modules, replayTools } : topModule.modules

  const getStore = () => store

  const prevStore = window.store
  const isHMR = !!prevStore && !replays.replay

  const modulePathsAll = createModulePaths(topModuleOriginal)

  const eventsAll = createEvents(topModuleOriginal, getStore)
  
  const modulePathsById = createModulePathsById(topModule)
  const modulePaths = createModulePaths(topModule)
  const reducers = createReducers(topModule)
  const selectors = createSelectors(topModule)
  const events = !modulePath ? eventsAll : createEvents(topModule, getStore)

  const eventFrom = createEventFrom(getStore, events)
  const fromEvent = createFromEvent(getStore)

  const cache = createCache(getStore, options.cache)

  const subscribe = function(send) {
    send.modulePath = this.modulePath
    this.listeners.push(send)

    return () => {
      const index = this.listeners.findIndex(l => l === send)
      this.listeners.splice(index, 1)
    }
  }

  const notify = e => {
    const sent = store.listeners.map(send => {
      const isSelfOrAncestor = e.modulePath.indexOf(send.modulePath) === 0
      if (!isSelfOrAncestor) return
      
      const storeSlice = sliceStoreByModulePath(store, send.modulePath)
      const eSlice = sliceEventByModulePath(e, send.modulePath)

      return send(storeSlice, eSlice)
    })

    const promise = Promise.all(sent).catch(error => {
      store.onError({ error, kind: 'subscriptions', e })
    })

    if (store.shouldAwait()) return promise
  }

  const awaitInReplaysOnly = async func => {
    if (store.shouldAwait()) await func()
    else func()
  }

  const getSnapshot = withSelectors => withSelectors ? createLazyModulesGetterProxy(snapshot(state), modulePaths, selectors) : snapshot(state)

  const stringifyState = st => JSON.stringify(snapshot(st || state), replacer)
  const parseJsonState = json => JSON.parse(json, createReviver(store.events))

  const replaceState = next => { Object.keys(state).forEach(k => delete state[k]); Object.assign(state, next); }

  const onError = err => {
    const { error, kind = 'unknown-kind', e } = err

    console.error('respond: ' + kind)
    console.error(error)

    if (e) console.error(e)

    return options.onError?.({ ...err, store })
  }
  
  const linkOut = createLinkOut(getStore)

  const shouldAwait = () => window.isFastReplay || process.env.NODE_ENV === 'test'

  const store = { ...merge, cookies, db, replays, render, refs: {}, ctx: { init: true }, listeners: [], promises: [], snapshot, awaitInReplaysOnly, shouldAwait, prevStore, topModuleOriginal, topModule, events, modulePath: '', eventsAll, modulePathsAll, modulePaths, modulePathsById, cache, subscribe, reduce, reducers, notify, replaceState, eventFrom, fromEvent, selectors, getSnapshot, options, addToCache, addToCacheDeep, exitBack, exitForward, disableForwardButton, getStore, onError, stringifyState, parseJsonState, linkOut }
  
  store.changePath = setupHistory(store)

  const baseState = { cachedPaths: {}, token: cookies.get('token') || replays.token }
  const top = { ...topModule, initialState: { ...baseState, ...topModule.initialState } }

  const initialState = isHMR
    ? snapshot(prevStore.state)
    : getSessionState(events) || await createInitialState(top, store)

  const state  = proxy(initialState, modulePaths, selectors)

  store.state = state
  store.prevState = isHMR ? prevStore.prevState : getSnapshot(true)

  if (!isHMR) {
    reduce(store, events.init(), true, true)
  }

  store.devtools = shouldUseDevtools(options) ? createDevTools(store) : createDevtoolsMock(store)

  store.dispatch = createDispatch(getStore)
  store.dispatchSync = createDispatchSync(getStore)
  
  db.store = store
  replays.store = store
  
  return window.store = store
}
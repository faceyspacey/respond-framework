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
import sliceByModulePath, { sliceEventByModulePath } from '../utils/sliceByModulePath.js'
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





export default async (topModuleOriginal, settings) => {
  window.topModuleOriginal = topModuleOriginal
  window.admin = topModuleOriginal.admin
  // topModuleOriginal = { ...topModuleOriginal }

  const replay = !!settings && !isProd
  settings ??= await restoreSettings()

  const modulePath = settings?.module || ''
  // const topModule = !modulePath ? topModuleOriginal : Object.assign({}, sliceByModulePath(topModuleOriginal, modulePath))
  const topModule = !modulePath ? topModuleOriginal : sliceByModulePath(topModuleOriginal, modulePath)

  // topModule.modules = !isProd || options.productionReplayTools ? { ...topModule.modules, replayTools } : topModule.modules
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
  
  delete topModule.props // props passed from parent are not available when using replayTools to focus child modules
  
  const options = {
    merge: {},
    defaultPlugins,
    defaultPluginsSync,
    ...topOptions,
    displaySelectorsInDevtools: displaySelectorsInDevtools(topOptions),
  }

  const {
    merge,
    createHistory = createHistoryDefault
  } = options

  const db = createClientDatabase(topModule, topModuleOriginal)

  const getStore = () => state

  const prevStore = window.store
  const isHMR = !!prevStore && !replays.replay

  const modulePathsAll = createModulePaths(topModuleOriginal)

  const eventsAll = createEvents(topModuleOriginal, getStore)
  
  topModule.id ??= '1'
  
  const modulePathsById = createModulePathsById(topModule)
  const modulePaths = createModulePaths(topModule)
  const events = !modulePath ? eventsAll : createEvents(topModule, getStore)

  const eventFrom = createEventFrom(getStore, events)
  const fromEvent = createFromEvent(getStore)

  const dispatch = createDispatch(getStore)
  const dispatchSync = createDispatchSync(getStore)

  const isEqualNavigations = (a, b) => a && b && fromEvent(a).url === fromEvent(b).url

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
    const sent = state.listeners.map(send => {
      const isSelfOrAncestor = e.modulePath.indexOf(send.modulePath) === 0
      if (!isSelfOrAncestor) return
      
      const storeSlice = sliceByModulePath(state, send.modulePath)
      const eSlice = sliceEventByModulePath(e, send.modulePath)

      return send(storeSlice, eSlice)
    })

    const promise = Promise.all(sent).catch(error => {
      store.onError({ error, kind: 'subscriptions', e })
    })

    if (store.shouldAwait()) return promise
  }

  const promises = []

  const awaitInReplaysOnly = async func => {
    if (store.shouldAwait()) await func()
    else {
      promises.push(func())
    }
  }

  const getSnapshot = withSelectors => snapshot(state)

  const stringifyState = st => JSON.stringify(snapshot(st || state), replacer)
  const parseJsonState = json => JSON.parse(json, createReviver(store.events))

  const replaceState = next => { Object.keys(state).forEach(k => delete state[k]); Object.assign(state, next); }

  const onError = err => {
    const { error, kind = 'unknown', e } = err

   if (kind !== 'render') { // react render errors already logged
    console.error('respond: ' + kind, e || '')
    console.error(error)
   }

    return options.onError?.({ ...err, store })
  }
  
  const shouldAwait = () => window.isFastReplay || process.env.NODE_ENV === 'test'

  const store = { ...merge, cookies, db, replays, render, refs: {}, ctx: { init: true }, listeners: [], promises, dispatch, dispatchSync, snapshot, awaitInReplaysOnly, shouldAwait, prevStore, events, modulePath: '', eventsAll, modulePathsAll, modulePaths, modulePathsById, cache, subscribe, reduce, notify, replaceState, eventFrom, fromEvent, isEqualNavigations, getSnapshot, options, addToCache, addToCacheDeep, getStore, onError, stringifyState, parseJsonState }
  Object.defineProperties(store, {
    topModule: { value: topModule, enumerable: false, configurable: true },
    topModuleOriginal: { value: topModule, enumerable: false, configurable: true },
  })
  
  store.history = createHistory(store)

  const baseState = { cachedPaths: {}, token: replays.token }
  const top = { ...topModule }

  top.initialState ??= {}
  Object.assign(top.initialState, baseState)
  
  const initialState = isHMR
    ? snapshot(prevStore.state)
    : isProd || options.enablePopsInDevelopment
      ? getSessionState(events) || await createInitialState(top, store, db)
      : await createInitialState(top, store, db)

  // Object.assign(initialState, store)
  Object.defineProperties(initialState, Object.getOwnPropertyDescriptors(store))

  const s = { ...store }
  delete s.events
  delete s.prevStore
  delete s.topModule
  delete s.topModuleOriginal
  delete s.modulePath
  delete s.options


  recurseModules(top, initialState, events, topModuleOriginal.db.nested, db, () => store.devtools, s)

  // Object.defineProperty(initialState, 'state', { get: () => state, enumerable: false })
  Object.defineProperty(initialState.replayTools, 'state', { get: () => state.replayTools, enumerable: false, configurable: true })
  Object.defineProperty(initialState.admin, 'state', { get: () => state.admin, enumerable: false, configurable: true })
  Object.defineProperty(initialState.website, 'state', { get: () => state.website, enumerable: false, configurable: true })

  const proto = Object.getPrototypeOf(initialState)

  Object.defineProperties(proto, {
    state: { get: () => state, enumerable: false, configurable: true },
  })

  const state  = createProxy(initialState)

  store.state = state
  state.prevState = isHMR ? prevStore.prevState : getSnapshot(true)

  if (!isHMR) {
    reduce(store, events.init(), true, true)
  }

  store.devtools = !shouldUseDevtools(options) ? createDevTools(store) : createDevtoolsMock(store)

  Object.defineProperty(db, 'store', { enumerable: false, configurable: true, value: state })
  Object.defineProperty(replays, 'store', { enumerable: false, configurable: true, value: state })

  return window.store = state
}


const recurseModules = (mod, state, events, nested, db, getDevtools, store, parent = {}, moduleName) => {
  state.events = events
  Object.assign(state, store)
  
  const { options, moduleKeys, modulePath, plugins, pluginsSync, id, components, reducers = {}, props } = mod
  Object.assign(state, { options, moduleKeys, modulePath, plugins, pluginsSync, id, components, props, reducers })

  if (props?.reducers) {
    const propsReducers = props.reducers
    const parentReducers = parent.reducers

    const proto = Object.getPrototypeOf(state)
    const parentKeys = Object.keys(parentReducers)

    Object.keys(propsReducers).forEach(k => {
      const reducer = propsReducers[k]
      const parentK = parentKeys.find(k => parentReducers[k] === reducer)

      const k2 = parentK ?? moduleName + '_' + k

      parentReducers[k2] = reducer

      const get = function() { return this._parent[k2] }
      Object.defineProperty(proto, k, { get, configurable: true })

      if (reducers[k]) reducers[k].__overridenByProp = true   // delete potential child reducer mock, so selector takes precedence
      delete state[k]                                         // delete potential initialState too
    })
  }

  Object.defineProperty(state, 'db', { enumerable: false, configurable: true, value: !nested ? db : createDbProxy(db, modulePath) })

  Object.defineProperty(state, 'devtools', { get: getDevtools, configurable: true })

  mod.moduleKeys.forEach(k => {
    recurseModules(mod[k], state[k], events[k], nested, db, getDevtools, store, state, k)
  })
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

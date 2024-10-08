import createReplays from '../replays/index.js'
import createDevTools from '../devtools/index.js'
import createDevtoolsMock from '../devtools/index.mock.js'
import createDispatch from './createDispatch.js'
import createDispatchSync from './createDispatchSync.js'
import createFromEvent from '../utils/createFromEvent.js'
import createEventFrom from '../utils/createEventFrom.js'
import createCache from '../utils/createCache.js'
import createCookies from '../cookies/index.js'
import createOptions from './createOptions.js'
import snapshot from '../proxy/snapshot.js'
import createProxy from '../proxy/createProxy.js'
import shouldUseDevtools from '../utils/shouldUseDevtools.js'
import reduce from './plugins/reduce.js'
import { addToCache, addToCacheDeep } from '../utils/addToCache.js'
import revive, { replacer, createStateReviver } from '../utils/revive.js'
import sliceByModulePath from '../utils/sliceByModulePath.js'
import createInitialState from '../utils/createInitialState.js'
import restoreSettings from '../replays/helpers/restoreSettings.js'
import render from '../react/render.js'
import { isProd } from '../utils/bools.js'
import onError from './utils/onError.js'
import { subscribe, notify } from './utils/subscribe.js'


export default async (top, { settings, hydration } = {}) => {
  settings ??= await restoreSettings()
  
  const getStore = () => state

  const prevStore = window.store

  const replay = !!settings && !isProd
  const hmr = !!prevStore && !replay

  const modulePath = settings?.module || ''
  const mod = sliceByModulePath(top, modulePath)

  const findInClosestParent = createFindInClosestParent(top, modulePath)

  const topCookies = mod.cookies ?? findInClosestParent('cookies')
  const topReplays = mod.replays ?? findInClosestParent('replays')
  const topOptions = mod.options ?? findInClosestParent('options')

  const cookies = createCookies(topCookies)
  const replays = createReplays({ ...topReplays, replay, settings: { ...settings, token: await cookies.get('token') } })
  const options = createOptions(topOptions)
  
  const eventFrom = createEventFrom(getStore)
  const fromEvent = createFromEvent(getStore)

  const dispatch = createDispatch(getStore)
  const dispatchSync = createDispatchSync(getStore)

  const history = options.createHistory(mod)
  const cache = createCache(getStore, options.cache)

  const lazyCreateDevtools = () => !shouldUseDevtools(options) ? createDevTools(state) : createDevtoolsMock()

  const stringifyState = st => JSON.stringify(snapshot(st || state), replacer)
  const parseJsonState = json => JSON.parse(json, createStateReviver(state))

  const replaceState = next => { Object.keys(state).forEach(k => delete state[k]); Object.assign(state, next); }

  const shouldAwait = () => window.isFastReplay || process.env.NODE_ENV === 'test'
  const awaitInReplaysOnly = async f => shouldAwait() ? await f() : state.promises.push(f())

  const isEqualNavigations = (a, b) => a && b && fromEvent(a).url === fromEvent(b).url
  const getProxy = orig => proxyCache.proxy.get(orig) ?? orig

  const proxyCache = { proxy: new WeakMap, snap: new WeakMap }
  
  const api = { ...options.merge, findInClosestParent, ctx: { init: true }, listeners: [], promises: [], refs: {}, eventsByPath: {}, modelsByModulePath: {}, eventsByType: {}, modulePaths: {}, modulePathsById: {}, get devtools() { return options.d ?? (options.d = lazyCreateDevtools()) }, getProxy, top, options, cookies, replays, history, render, onError, snapshot, dispatch, dispatchSync, awaitInReplaysOnly, shouldAwait, cache, reduce, subscribe, notify, replaceState, eventFrom, fromEvent, isEqualNavigations, addToCache, addToCacheDeep, getStore, onError, stringifyState, parseJsonState }
  
  const initialState = await createInitialState(mod, api, replays, hydration, hmr && prevStore.prevState)
  const state = createProxy(initialState, undefined, proxyCache)

  if (!hmr) {
    state.prevState = snapshot(state)
    reduce(state, state.events.start())
  }

  return window.store = replays.store = state
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


const createFindInClosestParent = (slice, modulePath) => {
  const parentModules = []

  if (modulePath) {
    modulePath.split('.').forEach(k => {
      parentModules.unshift(slice)
      slice = slice[k]
    })
  }

  return key => parentModules.find(p => p[key])?.[key]
}
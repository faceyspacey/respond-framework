import createClientDatabase from '../db/createClientDatabase.js'
import createModels from '../db/createModels.js'
import findOne from '../selectors/findOne.js'
import createEvents from '../store/createEvents.js'
import createReducers from '../store/createReducers.js'
import createPlugins from '../store/createPlugins.js'
import getSessionState from './getSessionState.js'
import createSelectors from '../store/createSelectors.js'
import * as replayToolsModule from '../modules/replayTools/index.js'
import { isProd } from './bools.js'
import { snapDeepClone } from '../proxy/snapshot.js'
import revive, { createStateReviver } from './revive.js'


export default async (mod, store, hmr, hydration, { token, replay }, { prevState, replayTools } = {}) => {
  const state = await addModule(mod, store, new Map, undefined, '', {})

  const json = replay ? { ...hydration, replayTools }
                : hmr ? { ...prevState, replayTools }
                :       getSessionState() || hydration

  return hydrateModules(state, json, token)
}


const addModule = async (mod, store, eventsCache, moduleName, modulePath = '', parent = {}, props = {}) => {
  const { id, module, ignoreChild, initialState, components, events = {}, models, db, replays, options, plugins, pluginsSync } = mod
  if (!id) throw new Error('respond: missing id on module: ' + modulePath)

  const proto = {}
  const state = Object.create(proto)

  Object.defineProperties(proto, Object.getOwnPropertyDescriptors(store))

  Object.assign(proto, {
    __module: true,
    id,
    ignoreChild,
    modulePath,
    findOne,
    models: createModels(store, models, parent, modulePath),
    db: createClientDatabase(db, parent.db, props, state, store.findInClosestParent),
    _plugins: createPlugins(store.options.defaultPlugins, plugins),
    _pluginsSync: createPlugins(store.options.defaultPluginsSync, pluginsSync),
  })

  const moduleKeys = []

  const reducers = mod.reducers ? cloneDeep(mod.reducers) : {}

  const descriptors = Object.getOwnPropertyDescriptors(mod)

  const selectors = mod.selectors?.__esModule ? { ...mod.selectors } : mod.selectors ?? {}
  const selectorDescriptors = Object.getOwnPropertyDescriptors(selectors)

  Object.keys(descriptors).forEach(k => {
    if (moduleApi[k]) return

    const descriptor = descriptors[k]
    const { get, value: v } = descriptor

    if (get) {
      selectorDescriptors[k] = descriptor
    }
    else if (v?.module === true) {
      moduleKeys.push(k)
    }
    else if (typeof v === 'function') {
      if (v.length >= 2) reducers[k] = v
      else selectorDescriptors[k] = descriptor
    }
    else {
      state[k] = cloneDeep(v)
    }
  })

  const initial = typeof initialState === 'function' ? await initialState(state) : initialState
  if (initial) Object.assign(state, cloneDeep(initial))


  const propReducers = props.reducers ? cloneDeep(props.reducers) : {}

  const propDescriptors = Object.getOwnPropertyDescriptors(props)

  const propSelectors = props.selectors?.__esModule ? { ...props.selectors } : props.selectors ?? {}
  const propSelectorDescriptors = Object.getOwnPropertyDescriptors(propSelectors)

  Object.keys(propDescriptors).forEach(k => {
    if (moduleApi[k]) return

    const descriptor = descriptors[k]
    const { get, value: v } = descriptor

    if (get) {
      propSelectorDescriptors[k] = descriptor
    }
    else if (typeof v === 'function') {
      if (v.length >= 2) propReducers[k] = v
      else propSelectorDescriptors[k] = descriptor
    }
    else {
      state[k] = cloneDeep(v)
    }
  })

  const propInitial = typeof props.initialState === 'function' ? await props.initialState(parent) : props.initialState
  if (propInitial) Object.assign(state, cloneDeep(propInitial))


  Object.defineProperties(state, {
    state: { enumerable: false, configurable: true, get: () => store.getProxy(state) },
    _parent: { enumerable: false, configurable: true, writable: false, value: parent },
    components: { enumerable: false, configurable: false, writable: false, value: components },
    moduleKeys: { enumerable: false, configurable: true, writable: true, value: moduleKeys },
  })
  
  state.events = createEvents(store, eventsCache, events, props.events, modulePath)

  createSelectors(proto, selectorDescriptors, propSelectorDescriptors, reducers, state, store)

  createReducers(proto, state, moduleName, reducers, propReducers, parent.reducers, store)

  for (const k of moduleKeys) {
    const p = modulePath ? `${modulePath}.${k}` : k
    state[k] = await addModule(mod[k], store, eventsCache, k, p, state, mod[k].props)
  }

  if (!modulePath && store.options.replayToolsEnabled) { // add to top module only
    const k = 'replayTools'
    state[k] = await addModule(replayToolsModule, store, eventsCache, k, k, state)
    moduleKeys.push(k)
  }

  store.modulePaths[modulePath] = true
  store.modulePathsById[id] = modulePath

  return state
}



const cloneDeep = o => isProd ? o : snapDeepClone(o) // clones only needed during development when replayEvents requires non-mutated initial modules/state



const hydrateModules = (state, json, token) => {
  state.token = token
  state.cachedPaths ??= {}

  if (!json) return state

  if (typeof json === 'object') {
    mergeModules(state, revive(state)(json))
  }
  else {
    mergeModules(state, JSON.parse(json, createStateReviver(state)))
  }

  return state
}



const mergeModules = (state, json) => {
  state.moduleKeys.forEach(k => {
    if (!json[k]) return
    mergeModules(state[k], json[k])
    delete json[k] // not deleting would overwrite fully created modules; instead delete so a depth-first shallow merge is performed for each module
  })

  Object.assign(state, json) // shallow -- user expectation is for state to be exactly what was hydrated (after revival)
}



const moduleApi = {
  __esModule: true,
  id: true,
  module: true,
  ignoreChild: true,
  initialState: true,
  components: true,
  events: true,
  selectors: true,
  reducers: true,
  props: true,
  models: true,
  db: true,
  replays: true,
  options: true,
  plugins: true,
  pluginsSync: true,
}
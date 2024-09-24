import createClientDatabase from '../db/createClientDatabase.js'
import createControllers from '../db/createControllers.js'
import createDbProxy from '../db/utils/createDbProxy.js'
import mergeModels from '../db/utils/mergeModels.js'
import findOne from '../selectors/findOne.js'
import createEvents from '../store/createEvents.js'
import { isProd } from './bools.js'
import getSessionState from './getSessionState.js'


export default async ({ ...mod }, store, token) => {
  // if (isProd || mod.options?.enablePopsInDevelopment) {
  //   const state = getSessionState(mod.events) // events won't exist yet in new format
  //   if (state) return Object.assign(state, store)
  // }

  mod.initialState ??= {}
  Object.assign(mod.initialState, { token, cachedPaths: {} })

  const eventsCache = new Map

  const state = await createInitialState(mod, store, eventsCache, undefined, {})

  eventsCache.clear()

  return state
}


const createInitialState = async (mod, store, eventsCache, moduleName, parent = {}) => {
  const proto = {}
  const state = Object.create(proto)

  const { initialState, selectors = {} } = mod
  const initial = typeof initialState === 'function' ? await initialState(store) : initialState

  Object.defineProperties(state, Object.getOwnPropertyDescriptors(initial ?? {}))
  Object.defineProperties(state, Object.getOwnPropertyDescriptors(parent[moduleName] ?? {}))

  const { moduleKeys, modulePath, plugins, pluginsSync, id, components, reducers = {}, props = {}, models } = mod
  Object.assign(state, { moduleKeys, modulePath, plugins, pluginsSync, id, components, props, reducers })
  
  Object.defineProperty(state, 'state', { enumerable: false, configurable: true, get: () => store.getProxy(state) })
  Object.defineProperty(state, '_parent', { enumerable: false, configurable: true, writable: false, value: parent })

  const db = createClientDatabase(mod.db, parent.db, state)

  Object.defineProperties(proto, {
    ...Object.getOwnPropertyDescriptors(store),
    findOne: { value: findOne },
    models: { value: models ? mergeModels(models) : parent.models },
    db: { value: db },
    __module: { value: true },
  })

  Object.keys(selectors).forEach(k => {
    const v = selectors[k]
    const kind = v.length === 0 ? 'get' : 'value'

    Object.defineProperty(proto, k, { [kind]: v, configurable: true })
  })

  if (props.selectors) {
    const propSelectors = props.selectors

    Object.keys(propSelectors).forEach(k => {
      const v = propSelectors[k]
      const kind = v.length === 0 ? 'get' : 'value'

      const v2 = v.length === 0
        ? function() { return v.call(this._parent) }
        : function(...args) { return v.apply(this._parent, args) }

      Object.defineProperty(proto, k, { [kind]: v2, configurable: true })

      if (reducers[k]) reducers[k].__overridenByProp = true   // delete potential child reducer mock, so selector takes precedence
      delete state[k]                                         // delete potential initialState too
    })
  }

  if (props.reducers) {
    const propReducers = props.reducers
    const parentReducers = parent.reducers

    const parentKeys = Object.keys(parentReducers)

    Object.keys(propReducers).forEach(k => {
      const reducer = propReducers[k]
      const parentK = parentKeys.find(k => parentReducers[k] === reducer)

      const k2 = parentK ?? moduleName + '_' + k

      parentReducers[k2] = reducer

      const get = function() { return this._parent[k2] }
      Object.defineProperty(proto, k, { get, configurable: true })

      if (reducers[k]) reducers[k].__overridenByProp = true   // delete potential child reducer mock, so selector takes precedence
      delete state[k]                                         // delete potential initialState too
    })
  }

  state.events = createEvents(mod, store.getStore, eventsCache, modulePath)

  for (const k of mod.moduleKeys) {
    state[k] = await createInitialState(mod[k], store, eventsCache, k, state)
  }

  return state
}
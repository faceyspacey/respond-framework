import createDbProxy from '../db/utils/createDbProxy.js'
import mergeModels from '../db/utils/mergeModels.js'
import findOne from '../selectors/findOne.js'
import { isProd } from './bools.js'
import getSessionState from './getSessionState.js'


export default ({ ...mod }, store, events, db, token) => {
  if (isProd || mod.options?.enablePopsInDevelopment) {
    const state = getSessionState(mod.events) // events won't exist yet in new format
    if (state) return Object.assign(state, store)
  }

  mod.initialState ??= {}
  Object.assign(mod.initialState, { token, cachedPaths: {} })

  const topModels = !store.topModuleOriginal.db?.nested && mergeModels(store.topModuleOriginal.db?.models)
  const state = createInitialState(mod, store, events, topModels, db, undefined, {})

  return Object.assign(state, store)
}


const createInitialState = async (mod, store, events, topModels, db, moduleName, parent = {}) => {
  const proto = {}
  const state = Object.create(proto)

  const { initialState, selectors = {} } = mod
  const initial = typeof initialState === 'function' ? await initialState(store) : initialState

  Object.defineProperties(state, Object.getOwnPropertyDescriptors(initial ?? {}))
  Object.defineProperties(state, Object.getOwnPropertyDescriptors(parent[moduleName] ?? {}))

  const { moduleKeys, modulePath, plugins, pluginsSync, id, components, reducers = {}, props = {}, } = mod
  Object.assign(state, { moduleKeys, modulePath, plugins, pluginsSync, id, components, props, reducers, events })
  
  Object.defineProperty(state, 'state', { enumerable: false, configurable: true, get: () => store.getProxy(state) })
  Object.defineProperty(state, '_parent', { enumerable: false, configurable: true, writable: false, value: parent })

  Object.defineProperties(proto, {
    ...Object.getOwnPropertyDescriptors(store),
    findOne: { value: findOne },
    models: { value: topModels || mergeModels(mod.db?.models) },
    db: { value: !store.topModuleOriginal.db?.nested ? db : createDbProxy(db, modulePath) },
    replays: { value: store.replays },
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

  for (const k of mod.moduleKeys) {
    state[k] = await createInitialState(mod[k], store, events[k], topModels, db, k, state)
  }

  return state
}
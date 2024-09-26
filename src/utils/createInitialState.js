import createClientDatabase from '../db/createClientDatabase.js'
import mergeModels from '../db/utils/mergeModels.js'
import findOne from '../selectors/findOne.js'
import createEvents from '../store/createEvents.js'
import createReducers from '../store/createReducers.js'
import createPlugins from '../store/createPlugins.js'
import getSessionState from './getSessionState.js'


export default async ({ ...mod }, store, token) => {
  mod.initialState ??= {}
  Object.assign(mod.initialState, { token, cachedPaths: {} })

  const eventsCache = new Map

  const state = await createInitialState(mod, store, eventsCache, undefined, '', {})

  // const sessionState = getSessionState(state)

  // if (sessionState) {
  //   mergeDeep(state, sessionState)
  // }

  eventsCache.clear()

  return state
}


const createInitialState = async (mod, store, eventsCache, moduleName, modulePath, parent = {}) => {
  const proto = {}
  const state = Object.create(proto)

  const { initialState, selectors = {} } = mod
  const initial = (typeof initialState === 'function' ? await initialState(store) : initialState) ?? {}

  state.events = createEvents(store, eventsCache, mod, modulePath)

  Object.defineProperties(state, Object.getOwnPropertyDescriptors(initial))

  const moduleKeys = Object.keys(mod).reduce((acc, k) => {
    if (mod[k]?.module === true) acc.push(k)
    return acc
  }, [])

  const { id, components, reducers = {}, props = {}, models } = mod
  Object.assign(state, { modulePath, moduleKeys, id, components, props, reducers })
  
  if (!id) throw new Error('respond: missing id on module: ' + modulePath)

  store.modulePaths[modulePath] = true
  store.modulePathsById[id] = modulePath

  Object.defineProperty(state, 'state', { enumerable: false, configurable: true, get: () => store.getProxy(state) })
  Object.defineProperty(state, '_parent', { enumerable: false, configurable: true, writable: false, value: parent })

  Object.defineProperties(proto, {
    ...Object.getOwnPropertyDescriptors(store),
    findOne: { value: findOne },
    models: { value: models ? mergeModels(models) : parent.models ?? mergeModels(store.findInClosestParent('models')) },
    __module: { value: true },
  })

  Object.defineProperty(proto, 'db', {
    value: createClientDatabase(mod.db, parent.db, props, state)
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

      if (reducers[k]) reducers[k].__overridenByProp = true           // delete potential child reducer mock, so selector takes precedence
      delete state[k]                                                 // delete potential initialState too
    })
  }

  if (props.reducers) {
    createReducers(proto, state, moduleName, reducers, props.reducers, parent.reducers)
  }

  if (props.state) {
    Object.defineProperties(state, Object.getOwnPropertyDescriptors(props.state))
  }

  if (parent[moduleName]) { // parent hydrated state
    Object.defineProperties(state, Object.getOwnPropertyDescriptors(parent[moduleName]))
  }
  

  Object.defineProperties(proto, {
    _plugins: { value: createPlugins(state, store.options.defaultPlugins, mod.plugins) },
    _pluginsSync: { value: createPlugins(state, store.options.defaultPluginsSync, mod.pluginsSync) },
  })

  for (const k of moduleKeys) {
    const p = modulePath ? `${modulePath}.${k}` : k
    state[k] = await createInitialState(mod[k], store, eventsCache, k, p, state)
  }

  return state
}
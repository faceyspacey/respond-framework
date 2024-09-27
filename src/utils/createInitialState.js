import createClientDatabase from '../db/createClientDatabase.js'
import mergeModels from '../db/utils/mergeModels.js'
import findOne from '../selectors/findOne.js'
import createEvents from '../store/createEvents.js'
import createPropReducers from '../store/createPropReducers.js'
import createPlugins from '../store/createPlugins.js'
import getSessionState from './getSessionState.js'
import createSelectors from '../store/createSelectors.js'


export default async ({ ...mod }, store, token) => {
  mod.initialState ??= {}
  Object.assign(mod.initialState, { token, cachedPaths: {} })

  const eventsCache = new Map

  const state = await createInitialState(mod, store, eventsCache, undefined, '', {})

  // const sessionState = getSessionState(state)

  // if (sessionState) {
  //   mergeDeep(state, sessionState)
  // }

  return state
}


const createInitialState = async (mod, store, eventsCache, moduleName, modulePath = '', parent = {}) => {
  if (!mod.id) throw new Error('respond: missing id on module: ' + modulePath)

  store.modulePaths[modulePath] = true
  store.modulePathsById[mod.id] = modulePath

  const proto = {}
  const state = Object.create(proto)

  const { id, module: _, ignoreChild, initialState, components, events = {}, selectors = {}, reducers = {}, props = {}, models, db, replays, options, plugins, pluginsSync, ...rest } = mod
  const initial = (typeof initialState === 'function' ? await initialState(store) : initialState) ?? {}

  const moduleKeys = []
  const defaultState = {}

  Object.keys(rest).forEach(k => {
    const v = rest[k]

    if (v?.module === true) moduleKeys.push(k)
    else if (typeof v === 'function') {
      if (v.length >= 2) reducers[k] = v
      else selectors[k] = v
    }
    else defaultState[k] = v
  })

  Object.defineProperties(state, {
    ...Object.getOwnPropertyDescriptors({
      ...defaultState,
      ...initial,
      ...props.state,
      ...parent[moduleName], // parent hydrated state
      moduleKeys,
      components,
    }),
    state: { enumerable: false, configurable: true, get: () => store.getProxy(state) },
    _parent: { enumerable: false, configurable: true, writable: false, value: parent },
  })

  state.events = createEvents(store, eventsCache, events, props.events, modulePath)

  createSelectors(proto, selectors, props.selectors, reducers, state)

  createPropReducers(proto, state, moduleName, reducers, props.reducers, parent.reducers)

  Object.defineProperties(proto, {
    ...Object.getOwnPropertyDescriptors(store),
    ...Object.getOwnPropertyDescriptors({
      __module: true,
      id,
      ignoreChild,
      modulePath,
      findOne,
      props,
      reducers,
      models: models ? mergeModels(models) : parent.models ?? mergeModels(store.findInClosestParent('models')),
      db: createClientDatabase(db, parent.db, props, state),
      _plugins: createPlugins(state, store.options.defaultPlugins, plugins),
      _pluginsSync: createPlugins(state, store.options.defaultPluginsSync, pluginsSync),
    }),
  })

  for (const k of moduleKeys) {
    const p = modulePath ? `${modulePath}.${k}` : k
    state[k] = await createInitialState(mod[k], store, eventsCache, k, p, state)
  }

  return state
}
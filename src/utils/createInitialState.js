import createClientDatabase from '../db/createClientDatabase.js'
import createModels from '../db/createModels.js'
import findOne from '../selectors/findOne.js'
import createEvents from '../store/createEvents.js'
import createReducers from '../store/createReducers.js'
import createPlugins from '../store/createPlugins.js'
import getSessionState from './getSessionState.js'
import createSelectors from '../store/createSelectors.js'
import * as replayToolsModule from '../modules/replayTools/index.js'
import extractModuleAspects from '../store/extractModuleAspects.js'
import { _parent } from '../store/reserved.js'
import { hydrateModules} from '../store/mergeModules.js'


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
    components,
    state,
    [_parent]: parent,
    models: createModels(store, models, parent, modulePath),
    db: createClientDatabase(db, parent.db, props, state, store.findInClosestParent),
    _plugins: createPlugins(store.options.defaultPlugins, plugins),
    _pluginsSync: createPlugins(store.options.defaultPluginsSync, pluginsSync),
  })

  const [reducers, selectorDescriptors, moduleKeys] = extractModuleAspects(mod, state, initialState, state, [])
  const [propReducers, propSelectorDescriptors] = extractModuleAspects(props, state, props.initialState, parent)
  
  proto.moduleKeys = moduleKeys
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
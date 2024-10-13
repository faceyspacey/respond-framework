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
import { _module, _parent } from '../store/reserved.js'
import { hydrateModules} from '../store/mergeModules.js'


export default async (mod, respond, proto, state, hmr, hydration, { token, replay }, { prevState, replayTools } = {}) => {
  await addModule(mod, respond, new Map, undefined, '', {}, {}, proto, state)

  hydration = replay ? { ...hydration, replayTools }
                : hmr ? { ...prevState, replayTools }
                :       getSessionState() || hydration

  hydrateModules(state, hydration, token)
}


const addModule = async (mod, respond, eventsCache, moduleName, modulePath = '', parent = {}, props = {}, proto = {}, state = Object.create(proto)) => {
  const { id, module, ignoreChild, initialState, components, models, db, replays, options, plugins, pluginsSync } = mod
  if (!id) throw new Error('respond: missing id on module: ' + modulePath)

  Object.defineProperties(proto, Object.getOwnPropertyDescriptors(respond))

  Object.assign(proto, {
    [_module]: true,
    [_parent]: parent,
    id,
    ignoreChild,
    modulePath,
    findOne,
    components,
    state,
    respond,
    models: createModels(respond, models, parent, modulePath),
    db: createClientDatabase(db, parent.db, props, state, respond.findInClosestParent),
    _plugins: createPlugins(respond.options.defaultPlugins, plugins),
    _pluginsSync: createPlugins(respond.options.defaultPluginsSync, pluginsSync),
  })

  const [events, reducers, selectorDescriptors, moduleKeys] = extractModuleAspects(mod, state, initialState, state, [])
  const [propEvents, propReducers, propSelectorDescriptors] = extractModuleAspects(props, state, props.initialState, parent)
  
  proto.moduleKeys = moduleKeys
  proto.events = createEvents(respond, state, eventsCache, events, propEvents, modulePath)

  createSelectors(proto, selectorDescriptors, propSelectorDescriptors, reducers, state, respond)

  createReducers(proto, state, moduleName, reducers, propReducers, parent.reducers, respond)

  for (const k of moduleKeys) {
    const p = modulePath ? `${modulePath}.${k}` : k
    state[k] = await addModule(mod[k], respond, eventsCache, k, p, state, mod[k].props)
  }

  if (!modulePath && respond.options.replayToolsEnabled) { // add to top module only
    const k = 'replayTools'
    state[k] = await addModule(replayToolsModule, respond, eventsCache, k, k, state)
    moduleKeys.push(k)
  }

  respond.modulePathsById[id] = modulePath
  respond.modulePaths[modulePath] = state

  if (!modulePath) respond.modulePaths[undefined] = state

  return state
}
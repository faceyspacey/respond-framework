import createClientDatabase from '../db/createClientDatabase.js'
import createModels from '../db/createModels.js'
import createPlugins from './createPlugins.js'
import createEvents from './createEvents.js'
import createSelectors from './createSelectors.js'
import createReducers from './createReducers.js'

import extractModuleAspects from './extractModuleAspects.js'
import getSessionState from '../utils/getSessionState.js'

import findOne from '../selectors/findOne.js'
import { _module, _parent } from './reserved.js'
import { hydrateModules} from './mergeModules.js'
import { isProd } from '../utils.js'
import defaultPluginsSync from './pluginsSync/index.js'

import * as replayToolsModule from '../modules/replayTools/index.js'


export default async (mod, respond, proto, state, hmr, hydration, { token, replay }, { prevState, replayTools } = {}) => {
  await addModule(mod, respond, new Map, undefined, '', {}, {}, proto, state)

  hydration = replay  ? { ...hydration, replayTools }
                : hmr ? { ...prevState, replayTools }
                :       getSessionState() || hydration

  hydrateModules(state, hydration, token)
}


export const addModule = async (mod, respond, eventsCache, moduleName, modulePath = '', parent = {}, props = {}, proto = {}, state = Object.create(proto)) => {
  const { id, module, ignoreChild, initialState, components, replays, options = {}, plugins, pluginsSync } = mod
  if (!id) throw new Error('respond: missing id on module: ' + modulePath)

  respond = { ...options.merge, ...respond, state, modulePath, options }
  respond.respond = respond

  const db = createClientDatabase(mod.db, parent.db, props, state, respond, modulePath)
  const models = createModels(mod.models, db, parent, respond, modulePath)

  const _plugins = createPlugins(plugins)
  const _pluginsSync = createPlugins(pluginsSync ?? defaultPluginsSync)

  Object.assign(proto, { ...respond, [_module]: true, [_parent]: parent, id, ignoreChild, findOne, components, state, db, models, _plugins, _pluginsSync })

  const [evs, reducers, selectorDescriptors, moduleKeys] = extractModuleAspects(mod, state, initialState, state, [])
  const [propEvents, propReducers, propSelectorDescriptors] = extractModuleAspects(props, state, props.initialState, parent)
  
  const events = createEvents(respond, state, eventsCache, evs, propEvents, modulePath)

  Object.assign(proto, { moduleKeys, events })
  
  createSelectors(proto, selectorDescriptors, propSelectorDescriptors, reducers, state, respond)

  createReducers(proto, state, moduleName, reducers, propReducers, parent.reducers, respond)

  respond.modulePathsById[id] = modulePath
  respond.modulePaths[modulePath] = state

  for (const k of moduleKeys) {
    const p = modulePath ? `${modulePath}.${k}` : k
    state[k] = await addModule(mod[k], respond, eventsCache, k, p, state, mod[k].props)
    respond.state = state[k]

    // state[k].addModule = async (mod, k2) => { // todo: put code in createProxy to detect mod[_module] assignment, and automatically call this function
    //   const p = modulePath ? `${modulePath}.${k2}` : k2
    //   state[k][k2] = await addModule(mod, respond, eventsCache, k2, p, state, mod.props)
    // }
  }

  if (!modulePath && !isProd) { // add replayTools to top module only
    const k = 'replayTools'
    state[k] = await addModule(replayToolsModule, respond, eventsCache, k, k, state)
    moduleKeys.push(k)
    respond.state = state[k]
  }

  return state
}
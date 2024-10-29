import createClientDatabase from '../db/createClientDatabase.js'
import createModels from '../db/createModels.js'
import createPlugins from './createPlugins.js'
import createEvents from './createEvents.js'
import createSelectors from './createSelectors.js'
import createReducers from './createReducers.js'

import extractModuleAspects from './extractModuleAspects.js'

import findOne from '../selectors/findOne.js'
import { _module, _parent } from './reserved.js'
import { isProd } from '../utils.js'
import defaultPluginsSync from './plugins/edit/index.js'

import * as replayToolsModule from '../modules/replayTools/index.js'


export default async function addModule(
  mod,
  r,
  state = Object.create({}),
  parent = {},
  props = {},
  path = '',
  name, hydration = r.replays.hydration ?? {},
  ancestorPlugins,
  parentModulePath
) {
  const { id, ignoreParents, initialState, components, replays, reduce, options = {} } = mod
  if (!id) throw new Error('respond: missing id on module: ' + path)

  const respond = { ...options.merge, ...r, options, modulePath: path, overridenReducers: new Map }
  respond.respond = respond
  Object.defineProperty(respond, 'state', { get: () => r.modulePaths[path] ?? state, enumerable: false, configurable: true })

  state.basename = hydration.basename ?? props.basename ?? mod.basename ?? ''
  state.basenameFull = (parent.basenameFull ?? '') + state.basename

  const db = createClientDatabase(mod.db, parent.db, props, state, respond, path)
  const models = createModels(mod.models, db, parent, respond, path)

  const [plugins, propPlugins] = createPlugins(mod.plugins, props.plugins, ancestorPlugins, respond, parentModulePath)

  const proto = Object.getPrototypeOf(state)
  Object.assign(proto, { ...respond, [_module]: true, [_parent]: parent, id, ignoreParents, findOne, components, state, db, models, plugins, reduce })

  const [evs, reducers, selectorDescriptors, moduleKeys] = extractModuleAspects(mod, state, initialState, state, [])
  const [propEvents, propReducers, propSelectorDescriptors] = extractModuleAspects(props, state, props.initialState, parent)
  
  const events = createEvents(respond, state, evs, propEvents, path)

  Object.assign(proto, { moduleKeys, events })

  createReducers(proto, state, name, reducers, propReducers, parent.reducers, respond)

  createSelectors(proto, selectorDescriptors, propSelectorDescriptors, state, respond)

  respond.modulePathsById[id] = path
  respond.modulePaths[path] = state

  for (const k of moduleKeys) {
    const p = path ? `${path}.${k}` : k
    state[k] = await addModule(mod[k], r, undefined, state, mod[k].props, p, k, hydration[k], propPlugins, path)
    state[k].respond.state = state[k]
    // state[k].addModule = async (mod, k2) => { // todo: put code in createProxy to detect mod[_module] assignment, and automatically call this function
    //   const p = path ? `${path}.${k2}` : k2
    //   state[k][k2] = await addModule(mod, respond, k2, p, state, mod.props)
    // }
  }

  if (!path && !isProd) { // add replayTools to top module only
    const k = 'replayTools'
    state[k] = await addModule(replayToolsModule, r, undefined, state, undefined, k, k, hydration[k], propPlugins, path)
    state[k].respond.state = state[k]
    moduleKeys.push(k)
  }

  return state
}
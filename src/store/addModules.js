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

import * as replayToolsModule from '../modules/replayTools/index.js'


export default function addModule(
  mod,
  r,
  state,
  hydration = {},
  parent = {},
  props = {},
  branch = '',
  name,
  ancestorPlugins,
) {
  const { id, ignoreParents, components, reduce, options = {}, moduleKeys = [] } = mod
  if (!id) throw new Error('respond: missing id on module: ' + branch)

  r.modulePathsById[id] = branch
  r.modulePaths[branch] = state
  
  const respond = { ...options.merge, ...r, options, branch, moduleKeys, overridenReducers: new Map }
  respond.respond = respond
  Object.defineProperty(respond, 'state', { value: state, enumerable: false, configurable: true })

  state.basename = hydration.basename ?? props.basename ?? mod.basename ?? ''
  state.basenameFull = (parent.basenameFull ?? '') + state.basename

  const db = createClientDatabase(mod.db, parent.db, props, state, respond, branch)
  const models = createModels(mod.models, db, parent, respond, branch)

  const [plugins, propPlugins] = createPlugins(mod.plugins, props.plugins, ancestorPlugins, parent)

  const proto = Object.getPrototypeOf(state)
  Object.assign(proto, { ...respond, [_module]: true, [_parent]: parent, id, mod, ignoreParents, findOne, components, state, db, models, plugins, reduce })

  const [evs, reducers, selectorDescriptors] = extractModuleAspects(mod, state, state)
  const [propEvents, propReducers, propSelectorDescriptors] = extractModuleAspects(props, state, parent)
  
  createEvents(proto, respond, state, evs, propEvents, branch)
  createReducers(proto, name, reducers, propReducers, parent.reducers, respond, state)
  createSelectors(proto, selectorDescriptors, propSelectorDescriptors, respond, state)

  for (const k of moduleKeys) {
    const p = branch ? `${branch}.${k}` : k
    state[k] = Object.create({})
    addModule(mod[k], r, state[k], hydration[k], state, mod[k].props, p, k, propPlugins)

    // state[k].addModule = async (mod, k2) => { // todo: put code in createProxy to detect mod[_module] assignment, and automatically call this function
    //   const p = branch ? `${branch}.${k2}` : k2
    //   state[k][k2] = addModule(mod, respond, k2, p, state, mod.props)
    // }
  }

  if (!branch && !isProd) { // add replayTools to top module only
    const k = 'replayTools'
    state[k] = Object.create({})
    addModule(replayToolsModule, r, state[k], hydration[k], state, undefined, k, k, propPlugins)

    moduleKeys.push(k)
  }

  return state
}
import createClientDatabase from '../db/createClientDatabase.js'
import createModels from '../db/createModels.js'
import createPlugins from './createPlugins.js'
import createEvents from './createEvents.js'
import createSelectors from './createSelectors.js'
import createReducers from './createReducers.js'

import extractModuleAspects from './extractModuleAspects.js'

import findOne from '../selectors/findOne.js'
import { _parent } from './reserved.js'
import { is, thisIn } from '../utils/inIs.js'


export default function addModule(
  resp,
  mod,
  state,
  session = {},
  parent = {},
  name,
  props = {},
  ancestorPlugins,
  branch = name ?? ''
) {
  if (!mod.id) throw new Error('respond: missing id on module: ' + branch || 'top')
  
  state.__module = resp.branchesById[mod.id] = branch
  resp.branches[branch] = state
  
  const { id, ignoreParents, components, reduce, options = {}, moduleKeys = [] } = mod

  const respond = { ...options.merge, ...resp, state, id, mod, components, reduce, options, ignoreParents, branch, moduleKeys, overridenReducers: new Map }
  
  respond.respond = respond
  state.basename = session.basename ?? props.basename ?? mod.basename ?? ''
  state.basenameFull = (parent.basenameFull ?? '') + state.basename

  const db = createClientDatabase(mod.db, parent.db, state, respond, branch)
  const models = createModels(mod.models, db, parent, respond, branch)

  const [plugins, propPlugins] = createPlugins(mod.plugins, props.plugins, ancestorPlugins, parent)

  const [evs, reducers, selectorDescriptors] = extractModuleAspects(mod, state)
  const [propEvents, propReducers, propSelectorDescriptors] = extractModuleAspects(props, state, parent)

  const proto = Object.assign(Object.getPrototypeOf(state), { ...respond, [_parent]: parent, db, models, plugins, findOne, is, in: thisIn })
  
  createEvents(proto, respond, state, evs, propEvents, branch)
  createReducers(proto, name, reducers, propReducers, parent.reducers, respond, state)
  createSelectors(proto, selectorDescriptors, propSelectorDescriptors, respond, state)

  for (const k of moduleKeys) {
    state[k] = addModule(resp, mod[k], Object.create({}), session[k], state, k, mod[k].props, propPlugins, branch ? `${branch}.${k}` : k)
  }

  return state
}
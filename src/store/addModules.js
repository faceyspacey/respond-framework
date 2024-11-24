import createClientDatabase from '../db/createClientDatabase.js'
import createClientModels from '../db/createModels.js'
import createBasename from './createBasename.js'
import createEvents from './createEvents.js'
import createPlugins from './createPlugins.js'
import createReducers from './createReducers.js'
import createSelectors from './createSelectors.js'

import extractModuleAspects from './extractModuleAspects.js'
import { _parent } from './reserved.js'


export default function addModule(
  resp,
  mod,
  parent = {},
  name = '',
  state = Object.create({}),
  props = mod.props ?? {},
  branch = parent.respond?.branch ? `${parent.respond.branch}.${name}` : name
) {
  if (!mod.id) throw new Error('respond: missing id on module: ' + branch || 'top')
  
  resp.branchLocatorsById[mod.id] = branch
  resp.branches[branch] = state
  
  const { id, ignoreParents, components, reduce, options = {}, moduleKeys = [] } = mod

  const respond = { ...options.merge, ...resp, state, id, mod, branch, moduleKeys, components, reduce, options, ignoreParents, overridenReducers: new Map, get respond() { return respond } }
  const proto   = Object.assign(Object.getPrototypeOf(state), { ...respond, [_parent]: parent })
  const deps    = { respond, mod, parent, proto, state, props, branch, name }

  const [events,     reducers,     selectorDescriptors    ] = extractModuleAspects(mod, state)
  const [propEvents, propReducers, propSelectorDescriptors] = extractModuleAspects(props, state, parent)

  createClientDatabase(deps)
  createClientModels(deps)
  createBasename(deps)
  createPlugins(deps)
  createEvents(deps, events, propEvents)
  createReducers(deps, reducers, propReducers)
  createSelectors(deps, selectorDescriptors, propSelectorDescriptors)
  
  moduleKeys.forEach(k => addModule(resp, mod[k], state, k))

  return parent[name] = state
}
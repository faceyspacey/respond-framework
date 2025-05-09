import createEvents from './createEvents.js'
import createReducers from './createReducers.js'
import createSelectors from './createSelectors.js'

import createClientModels from '../db/createModels.js'
import createBasename from './createBasename.js'
import createPlugins from './createPlugins.js'

import extractModuleAspects from './extractModuleAspects.js'
import assignRenderingDependencies from './helpers/assignRenderingDependencies.js'
import assignProto from '../utils/assignProto.js'
import { _parent } from './reserved.js'


export default function addModule(mod, Respond, moduleName = '', parent = {}, state = Object.create({})) {
  const { branch, moduleKeys = [], options = {}, components, reduce, ignoreParents } = mod

  const respond = new Respond({ branch, mod, state, moduleName, moduleKeys, options, ignoreParents })
  const proto   = assignProto(state, { ...options.merge, respond, moduleKeys, options, components, reduce, [_parent]: parent })
  const props   = respond.isTop ? {} : mod.props ?? {} // props disabled on top focused module
  const deps    = { respond, mod, parent, proto, state, props, branch, moduleName }

  respond.branchLocatorsById[mod.id] = branch
  respond.branches[branch] = state

  ;(mod.build ?? props.build)?.(deps)

  const [events,     reducers,     selectors    ] = extractModuleAspects(mod, state)
  const [propEvents, propReducers, propSelectors] = extractModuleAspects(props, state)

  createBasename(deps)
  createEvents(deps,    events,    propEvents   )
  createReducers(deps,  reducers,  propReducers )
  createSelectors(deps, selectors, propSelectors)
  createClientModels(deps)
  createPlugins(deps)

  assignRenderingDependencies(deps)
  moduleKeys.forEach(k => addModule(mod[k], Respond, k, state)) // recurse

  ;(mod.buildAfter ?? props.buildAfter)?.(deps)

  return parent[moduleName] = state
}
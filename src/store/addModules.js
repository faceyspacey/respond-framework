import createClientModels from '../db/createModels.js'
import createBasename from './createBasename.js'
import createEvents from './createEvents.js'
import createPlugins from './createPlugins.js'
import createReducers from './createReducers.js'
import createSelectors from './createSelectors.js'

import extractModuleAspects from './extractModuleAspects.js'
import assignRenderingDependencies from './helpers/assignRenderingDependencies.js'
import { _parent, _module, _top } from './reserved.js'
import kinds from './kinds.js'
import { is, thisIn } from '../utils/inIs.js'


export default function addModule(Respond, mod, parent = {}, name = '', state = Object.create({})) {
  const { ignoreParents, components, reduce, options = {}, moduleKeys = [], branch } = mod

  const props   = name ? mod.props ?? {} : {} // props disabled on top focused module
  const respond = new Respond({ branch, moduleKeys, state, mod, props, components, reduce, options, moduleName: name, ignoreParents })
  const proto   = Object.assign(Object.getPrototypeOf(state), { ...options.merge, respond, [_module]: true, [_parent]: parent, [_top]: name === '', id: mod.id, db: respond.db, kinds, is, in: thisIn, top: respond.top, moduleKeys, ignoreParents, options, branch, moduleName: name, mod, components })
  const deps    = { respond, mod, parent, proto, state, props, branch, name }

  respond.branchLocatorsById[mod.id] = branch
  respond.branches[branch] = state

  ;(mod.build ?? props.build)?.(deps)

  const [events,     reducers,     selectors    ] = extractModuleAspects(mod, state)
  const [propEvents, propReducers, propSelectors] = extractModuleAspects(props, state)

  createEvents(deps,    events,    propEvents   )
  createReducers(deps,  reducers,  propReducers )
  createSelectors(deps, selectors, propSelectors)
  
  createClientModels(deps)
  createBasename(deps)
  createPlugins(deps)

  assignRenderingDependencies(deps)
  moduleKeys.forEach(k => addModule(Respond, mod[k], state, k))

  ;(mod.buildAfter ?? props.buildAfter)?.(deps)

  return parent[name] = state
}
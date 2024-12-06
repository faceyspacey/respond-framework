import createClientModels from '../db/createModels.js'
import createBasename from './createBasename.js'
import createEvents from './createEvents.js'
import createPlugins from './createPlugins.js'
import createReducers from './createReducers.js'
import createSelectors from './createSelectors.js'

import extractModuleAspects from './extractModuleAspects.js'
import { _parent, _module } from './reserved.js'
import kinds from './kinds.js'
import { is, thisIn } from '../utils/inIs.js'
import genId from '../utils/objectIdDevelopment.js'


export default function addModule(Respond, mod, parent = {}, name = '', state = Object.create({})) {
  const { id = genId(), ignoreParents, components, reduce, options = {}, moduleKeys = [], branch } = mod

  const respond = new Respond({ state, id, mod, branch, moduleKeys, components, reduce, options, moduleName: name })
  const proto   = Object.assign(Object.getPrototypeOf(state), { ...options.merge, respond, _module: true, [_parent]: parent, db: respond.db, kinds, is, in: thisIn, top: respond.top, moduleKeys, ignoreParents, state, options, branch, moduleName: name, id, mod, components })
  const props   = name ? mod.props ?? {} : {} // props disabled on top focused module
  const deps    = { respond, mod, parent, proto, state, props, branch, name }

  respond.branchLocatorsById[id] = branch
  respond.branches[branch] = state

  mod.build?.  (deps)
  props.build?.(deps)

  const [events,     reducers,     selectors    ] = extractModuleAspects(mod, state)
  const [propEvents, propReducers, propSelectors] = extractModuleAspects(props, state)

  createEvents(deps,    events,    propEvents   )
  createReducers(deps,  reducers,  propReducers )
  createSelectors(deps, selectors, propSelectors)
  
  createClientModels(deps)
  createBasename(deps)
  createPlugins(deps)
  
  mod.buildAfter?.  (deps)
  props.buildAfter?.(deps)

  moduleKeys.forEach(k => addModule(Respond, mod[k], state, k))

  return parent[name] = state
}
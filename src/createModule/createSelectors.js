import { _parent } from './reserved.js'
import token from './selectors/token.js'
import curr from './selectors/curr.js'


export default ({ respond, proto, state }, selectorDescriptors, propSelectorDescriptors) => {
  const { reducers } = proto

  if (!reducers.curr) {
    selectorDescriptors.curr ??= { get: curr }
  }

  Object.keys(selectorDescriptors).forEach(k => {
    const descriptor = selectorDescriptors[k]
    const { get, value: v = get } = descriptor
    
    const kind = v.length === 0 ? 'get' : 'value'

    Object.defineProperty(proto, k, { [kind]: v, configurable: true })

    if (reducers[k]) respond.overriden.set(reducers[k], true)   // selector takes precedence if both exist
    if (state.hasOwnProperty(k)) delete state[k]     // delete possible initialState for possible reducer
  })

  Object.keys(propSelectorDescriptors).forEach(k => {
    const descriptor = propSelectorDescriptors[k]
    const { get, value: v = get } = descriptor

    const kind = v.length === 0 ? 'get' : 'value'

    const v2 = v.length === 0
      ? function()        { return v.call(this[_parent])          }
      : function(...args) { return v.call(this[_parent], ...args) }

    Object.defineProperty(proto, k, { [kind]: v2, configurable: true })

    if (reducers[k]) respond.overriden.set(reducers[k], true)   // disable potential child reducer mock (aka "defaultProp")
    if (state.hasOwnProperty(k)) delete state[k]  // delete possible initialState

    respond.dependsOnAllAncestors = true
  })

  if (respond.branch) { // only children have a truthy branch
    Object.defineProperty(proto, 'token', { get: token, configurable: true })
  }
}

import { _parent } from './reserved.js'


export default ({ respond, proto, state }, selectorDescriptors, propSelectorDescriptors) => {
  const { reducers } = proto

  Object.keys(selectorDescriptors).forEach(k => {
    const descriptor = selectorDescriptors[k]
    const { get, value: v = get } = descriptor
    
    const kind = v.length === 0 ? 'get' : 'value'

    Object.defineProperty(proto, k, { [kind]: v, configurable: true })

    if (reducers[k]) respond.overridenReducers.set(reducers[k], true)   // selector takes precedence if both exist
    if (state.hasOwnProperty(k)) delete state[k]     // delete possible initialState for possible reducer
  })

  if (respond.branch) { // only children have a truthy branch
    propSelectorDescriptors.token = token // pass token from top module down to all children
  }

  Object.keys(propSelectorDescriptors).forEach(k => {
    const descriptor = propSelectorDescriptors[k]
    const { get, value: v = get } = descriptor

    const kind = v.length === 0 ? 'get' : 'value'

    const v2 = v.length === 0
      ? function() { return v.call(this[_parent]) }
      : function(...args) { return v.apply(this[_parent], args) }

    Object.defineProperty(proto, k, { [kind]: v2, configurable: true })

    if (reducers[k]) respond.overridenReducers.set(reducers[k], true)   // disable potential child reducer mock, so selector takes precedence
    if (state.hasOwnProperty(k)) delete state[k]  // delete possible initialState
  })
}


const token = {
  get() {
    return this.token
  }
}

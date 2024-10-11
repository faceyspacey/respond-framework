import { _parent } from './reserved.js'


export default (proto, selectorDescriptors, propSelectorDescriptors, reducers, state, store) => {
  Object.keys(selectorDescriptors).forEach(k => {
    const descriptor = selectorDescriptors[k]
    const { get, value: v = get } = descriptor
    
    const kind = v.length === 0 ? 'get' : 'value'

    Object.defineProperty(proto, k, { [kind]: v, configurable: true })
  })

  Object.keys(propSelectorDescriptors).forEach(k => {
    const descriptor = propSelectorDescriptors[k]
    const { get, value: v = get } = descriptor

    const kind = v.length === 0 ? 'get' : 'value'

    const v2 = v.length === 0
      ? function() { return v.call(this[_parent]) }
      : function(...args) { return v.apply(this[_parent], args) }

    Object.defineProperty(proto, k, { [kind]: v2, configurable: true })

    if (reducers[k]) store.overridenReducers.set(reducers[k], true)  // delete potential child reducer mock, so selector takes precedence
    delete state[k]                                                   // delete potential initialState too
  })
}


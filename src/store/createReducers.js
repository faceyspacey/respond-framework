import { _parent } from './reserved.js'
import curr from './reducers/curr.js'
import stack from './reducers/stack.js'


export default ({ respond, proto, state, parent, name }, reducers, propReducers) => {
  reducers = reducers.curr // preserve reducer order if stack or curr already exists
    ? reducers.stack ? { ...reducers }       : { stack, ...reducers }
    : reducers.stack ? { curr, ...reducers } : { stack, curr, ...reducers }

  proto.reducers = reducers
  
  const parentReducers = parent.reducers ?? {}
  const parentKeys = Object.keys(parentReducers)

  Object.keys(propReducers).forEach(k => {
    const reducer = propReducers[k]
    const parentK = parentKeys.find(k => parentReducers[k] === reducer)

    const k2 = parentK ?? name + '_' + k                                  // reuse existing reducer state if available (perf optimization)

    parentReducers[k2] = reducer                                          // if parent reducer doesn't exist, assign new reducer to parent

    const get = function() { return this[_parent][k2] }                   // the magic: simply select parent state (using reactive _parent symbol)
    Object.defineProperty(proto, k, { get, configurable: true })

    if (reducers[k]) respond.overridenReducers.set(reducers[k], true)     // disable possible child reducer mock, so reduce prop's selector takes precedence
    if (state.hasOwnProperty(k)) delete state[k]    // delete possible selector or initialState
  })
}
import { _parent } from './reserved.js'
import token from './reducers/token.js'
import userId from './reducers/userId.js'
import stack from './reducers/stack.js'


export default ({ respond, proto, state, parent, moduleName }, reducers, propReducers) => {
  if (respond.isTop) reducers = { token, userId, stack, ...reducers }
  else               reducers = { stack, ...reducers }

  proto.reducers = reducers
  
  const parentReducers = parent.reducers ?? {}
  const parentKeys = Object.keys(parentReducers)

  Object.keys(propReducers).forEach(k => {
    const reducer = propReducers[k]
    const parentK = parentKeys.find(k => parentReducers[k] === reducer)

    const k2 = parentK ?? moduleName + '_' + k                            // optimization: reuse existing reducer state if available

    parentReducers[k2] = reducer                                          // if parent reducer doesn't exist, assign new reducer to parent

    const get = function() { return this[_parent][k2] }                   // the magic: simply select parent state (using reactive _parent symbol)
    Object.defineProperty(proto, k, { get, configurable: true })

    if (reducers[k]) respond.overriden.set(reducers[k], true)             // disable possible child reducer mock, so reduce prop's selector takes precedence
    if (state.hasOwnProperty(k)) delete state[k]                          // delete possible initialState

    respond.dependsOnParent = true
  })
}
import { _parent } from './reserved.js'
import curr from './reducers/curr.js'
import { proxyStates } from '../proxy/utils/helpers.js'


export default (proto, moduleName, reducers, propReducers, parentReducers = {}, respond, state) => {
  const parentKeys = Object.keys(parentReducers)

  reducers = reducers.curr ? { ...reducers } : { curr: curr.bind(null), ...reducers }
  proto.reducers = reducers
  
  Object.keys(propReducers).forEach(k => {
    const reducer = propReducers[k]
    const parentK = parentKeys.find(k => parentReducers[k] === reducer)

    const k2 = parentK ?? moduleName + '_' + k                          // reuse existing reducer state if available (perf optimization)

    parentReducers[k2] = reducer                                        // if existing reducer, re-assign -- otherwise, new reducer assigned to parent

    const get = function() { return this[_parent][k2] }                 // the magic: simply select parent state
    Object.defineProperty(proto, k, { get, configurable: true })

    if (reducers[k]) respond.overridenReducers.set(reducers[k], true)   // disable possible child reducer mock, so reduce prop's selector takes precedence
    if (state.hasOwnProperty(k)) delete proxyStates.get(state).orig[k]  // delete possible selector or initialState
  })
}
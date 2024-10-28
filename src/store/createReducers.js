import { _parent } from './reserved.js'
import curr from './reducers/curr.js'


export default (proto, state, moduleName, reducers, propReducers, parentReducers = {}, respond) => {
  const parentKeys = Object.keys(parentReducers)

  const uniqueCurr = curr.bind(null)
  
  reducers = { curr: uniqueCurr, ...reducers }
  proto.reducers = reducers
  
  Object.keys(propReducers).forEach(k => {
    const reducer = propReducers[k]
    const parentK = parentKeys.find(k => parentReducers[k] === reducer)

    const k2 = parentK ?? moduleName + '_' + k                          // reuse existing reducer state if available (perf optimization)

    parentReducers[k2] = reducer                                        // if existing reducer, re-assign -- otherwise, new reducer assigned to parent

    const get = function() { return this[_parent][k2] }                 // the magic: simply select parent state
    Object.defineProperty(proto, k, { get, configurable: true })

    if (reducers[k]) respond.overridenReducers.set(reducers[k], true)   // delete potential child reducer mock, so selector takes precedence
    delete state[k]                                                     // delete potential initialState too (note: this would be a mistake if provided in userland; instead the corresponding parent state should be hydrated)
  })
}
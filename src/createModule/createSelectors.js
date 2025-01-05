import { _parent } from './reserved.js'
import token, { userId, adminUserId, adminUser } from './selectors/token.js'
import currSelector from './selectors/curr.js'


export default ({ respond, proto, state }, descriptors, propDescriptors) => {
  const { reducers } = proto

  descriptors = respond.isTop
    ? { curr, ...descriptors }
    : { curr, ...builtins, ...descriptors } // builtins inherit state from topState reducers

  Object.keys(descriptors).forEach(k => {
    if (reducers[k]) return // reducer takes precedence if both exist

    const descriptor = descriptors[k]
    const { get, value: v = get } = descriptor
    
    const kind = v.length === 0 ? 'get' : 'value'

    Object.defineProperty(proto, k, { [kind]: v, configurable: true })
  })

  Object.keys(propDescriptors).forEach(k => {
    const descriptor = propDescriptors[k]
    const { get, value: v = get } = descriptor

    const kind = v.length === 0 ? 'get' : 'value'

    const v2 = v.length === 0
      ? function()        { return v.call(this[_parent])          }
      : function(...args) { return v.call(this[_parent], ...args) }

    Object.defineProperty(proto, k, { [kind]: v2, configurable: true })

    if (reducers[k]) respond.overriden.set(reducers[k], true)   // disable potential child reducer mock (aka "defaultProp")
    if (state.hasOwnProperty(k)) delete state[k]                // delete possible initialState

    respond.dependsOnAllAncestors = true
  })
}



const curr = { get: currSelector }
const builtins = Object.getOwnPropertyDescriptors({ token, userId, adminUserId, adminUser })
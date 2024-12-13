import createSnapProxy from '../createSnapProxy.js'
import { canProxy, recordUsage, getProto, getOpd } from './helpers.js'
import { _module, _parent } from '../../store/reserved.js'
import sliceBranch from '../../utils/sliceBranch.js'
import useSnapshotPrevState from '../useSnapshotPrevState.js'


export default (snap, state) => {
  const handler = {
    has(snap, k) {
      recordUsage(state, snap, k, has)
      return Reflect.has(snap, k)
    },
    getOwnPropertyDescriptor(snap, k) {
      recordUsage(state, snap, k, gopd)
      return Reflect.getOwnPropertyDescriptor(snap, k)
    },
    ownKeys(snap) {
      recordUsage(state, snap, ownKeys, ownKeys)
      return Reflect.ownKeys(snap)
    },
    get(snap, k) {
      recordUsage(state, snap, k)
      const v = Reflect.get(snap, k)
      return canProxy(v) ? createSnapProxy(v, state) : v
    }
  }

  if (snap[_module]) handler.get = getModule(state, getOpd(getProto(snap)))
  if (snap.__type)   handler.get = getModel (state, getOpd(getProto(snap)))

  return handler
}




const ownKeys = 'ownKeys'
const has = 'has'
const gopd = 'getOwnPropertyDescriptor'




// variants for get handler:

const getModule = (state, protoDescriptors) => (snap, k, proxy) => {
  if (k === _parent) return state.parentProxy

  if (k === 'prevState') {
    const topSnapPrevState = useSnapshotPrevState(snap.respond.getStore()) // need to treverse from top to facilitate props reactivity from parents which possibly gets passed from top
    return sliceBranch(topSnapPrevState, snap.respond.branch) // slice to current module prevState
  }

  if (protoDescriptors[k]) {
    const { get, value } = protoDescriptors[k]
    return get ? get.call(proxy) : value                // getter -- needs proxy assigned to `this` and called now (as expected by getters), as getter function is otherwise not bound to proxy
  }

  recordUsage(state, snap, k)
  const v = Reflect.get(snap, k)
  return canProxy(v) ? createSnapProxy(v, state) : v
}





const getModel = (state, protoDescriptors) => (snap, k, proxy) => {
  if (protoDescriptors[k] && !snap.hasOwnProperty(k)) { // check hasOwnProperty to allow model protos to supply default overriable values on instances
    const { get, value } = protoDescriptors[k]
    
    if (get) return get.call(proxy)                     // getter -- needs proxy assigned to `this` and called now (as expected by getters), as getter function is otherwise not bound to proxy
    if (typeof value === 'function') return value       // will automatically be called as method with proxy as `this` by virtue of being called on an object in userland, eg: foo.bar()

    recordUsage(state, snap, k)                         // record usage, as value may be assigned to state, overriding proto, in the future -- could also be proto.prevState, which is made into a snapshot separately and benefits from the same immutable isChanged/affected reactivity
    return value
  }

  recordUsage(state, snap, k)
  const v = Reflect.get(snap, k)
  return canProxy(v) ? createSnapProxy(v, state) : v
}
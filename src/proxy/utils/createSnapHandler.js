import createSnapProxy from '../createSnapProxy.js'
import { canProxy, recordUsage, getProto, getOwnPropertyDescriptors } from './helpers.js'
import { _parent } from '../../store/reserved.js'


export default (snap, state) => {
  const protoDescriptors = getOwnPropertyDescriptors(getProto(snap))

  return {
    ownKeys(snap) {
      recordUsage(state.affected, ownKeys, snap)
      return Reflect.ownKeys(snap)
    },
    has(snap, k) {
      recordUsage(state.affected, has, snap, k)
      return Reflect.has(snap, k)
    },
    getOwnPropertyDescriptor(snap, k) {
      recordUsage(state.affected, gopd, snap, k)
      return Reflect.getOwnPropertyDescriptor(snap, k)
    },
    get(snap, k, proxy) {
      if (k === _parent) return state.parentProxy

      if (protoDescriptors[k] && !snap.hasOwnProperty(k)) { // check hasOwnProperty to allow for model protos to supply default values which can get overriden on concrete instances
        const { get, value } = protoDescriptors[k]
        
        if (get) return get.call(proxy)                     // getter
        if (typeof value === func) return value             // will be called as method with proxy as `this` automatically

        recordUsage(state.affected, g, snap, k)             // record usage, as value may be assigned to state, overriding proto, in the future -- could also be proto.prevState, which is made into a snapshot separately and benefits from the same immutable isChanged/affected reactivity
        return value
      }

      recordUsage(state.affected, g, snap, k)

      const v = Reflect.get(snap, k)
      return canProxy(v) ? createSnapProxy(v, state) : v
    }
  }
}


const ownKeys = 'ownKeys'
const has = 'has'
const gopd = 'getOwnPropertyDescriptor'
const g = 'get'

const func = 'function'









// import createSnapProxy from '../createSnapProxy.js'
// import { canProxy, recordUsage } from './helpers.js'
// import { isModule, _parent } from '../../store/reserved.js'


// export default (snap, state) => ({
//   ownKeys(snap) {
//     recordUsage(state.affected, ownKeys, snap)
//     return Reflect.ownKeys(snap)
//   },
//   has(snap, k) {
//     recordUsage(state.affected, has, snap, k)
//     return Reflect.has(snap, k)
//   },
//   getOwnPropertyDescriptor(snap, k) {
//     recordUsage(state.affected, gopd, snap, k)
//     return Reflect.getOwnPropertyDescriptor(snap, k)
//   },
//   get: state[isModule] ? getModule(state, getOpd(getProto(snap)))
//      : state.__type    ? getModel (state, getOpd(getProto(snap)))
//      :                   get(state)
// })


// const get = state => (snap, k) => {
//   recordUsage(state.affected, g, snap, k)
//   const v = Reflect.get(snap, k)
//   return canProxy(v) ? createSnapProxy(v, state) : v
// }




// const getModule = (state, protoDescriptors) => (snap, k, proxy) => {
//   if (k === _parent) return state.parentProxy

//   if (protoDescriptors[k]) {
//     const { get, value } = protoDescriptors[k]
//     return get ? get.call(proxy) : value                // getter -- needs proxy assigned to `this` and called now (as expected by getters), as getter function is otherwise not bound to proxy
//   }

//   recordUsage(state.affected, g, snap, k)
//   const v = Reflect.get(snap, k)
//   return canProxy(v) ? createSnapProxy(v, state) : v
// }



// const getModel = (state, protoDescriptors) => (snap, k, proxy) => {
//   if (protoDescriptors[k] && !snap.hasOwnProperty(k)) { // check hasOwnProperty to allow model protos to supply default overriable values on instances
//     const { get, value } = protoDescriptors[k]
    
//     if (get) return get.call(proxy)                     // getter -- needs proxy assigned to `this` and called now (as expected by getters), as getter function is otherwise not bound to proxy
//     if (typeof value === func) return value             // will automatically be called as method with proxy as `this` by virtue of being called on an object in userland, eg: foo.bar()

//     recordUsage(state.affected, g, snap, k)             // record usage, as value may be assigned to state, overriding proto, in the future -- could also be proto.prevState, which is made into a snapshot separately and benefits from the same immutable isChanged/affected reactivity
//     return value
//   }

//   recordUsage(state.affected, g, snap, k)
//   const v = Reflect.get(snap, k)
//   return canProxy(v) ? createSnapProxy(v, state) : v
// }




// const ownKeys = 'ownKeys'
// const has = 'has'
// const gopd = 'getOwnPropertyDescriptor'
// const g = 'get'

// const func = 'function'
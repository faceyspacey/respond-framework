import createSnapProxy from '../createSnapProxy.js'
import { canProxy, recordUsage } from './helpers.js'
import { _parent } from '../../store/reserved.js'


export default (snap, state) => {
  const protoDescriptors = gopd(getProto(snap))

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
      recordUsage(state.affected, getOwnPropertyDescriptor, snap, k)
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


const getProto = Object.getPrototypeOf
const gopd = Object.getOwnPropertyDescriptors

const ownKeys = 'ownKeys'
const has = 'has'
const getOwnPropertyDescriptor = 'getOwnPropertyDescriptor'

const func = 'function'
const g = 'get'
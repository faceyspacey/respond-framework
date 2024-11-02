import createSnapProxy from '../createSnapProxy.js'
import { canProxy, recordUsage } from './helpers.js'
import { _module, _parent } from '../../store/reserved.js'


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

      if (protoDescriptors[k] && !snap.hasOwnProperty(k)) {
        const { get, value } = protoDescriptors[k]
        
        if (get) return get.call(proxy)               // need to set `this` to proxy, as otherwise `this` within the getter will be the original object, lacking the proxy magic
        if (typeof value === func) return value       // will be called as method with proxy as `this` automatically

        recordUsage(state.affected, g, snap, k)     // record usage, as value may be assigned to state, overriding proto, in the future
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
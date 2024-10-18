import createSnapProxy from '../createSnapProxy.js'
import { canProxy, snapsToProxyCache, recordUsage } from './helpers.js'
import createProxy from '../createProxy.js'
import snapshot from '../snapshot.js'
import { _module, _parent } from '../../store/reserved.js'


export default (snap, state) => {
  const proto = Object.getPrototypeOf(snap)
  const protoDescriptors = Object.getOwnPropertyDescriptors(proto)

  return {
    ownKeys(snap) {
      recordUsage(state.affected, 'ownKeys', snap)
      return Reflect.ownKeys(snap)
    },
    has(snap, k) {
      recordUsage(state.affected, 'has', snap, k)
      return Reflect.has(snap, k)
    },
    getOwnPropertyDescriptor(snap, k) {
      recordUsage(state.affected, 'getOwnPropertyDescriptor', snap, k)
      return Reflect.getOwnPropertyDescriptor(snap, k)
    },
    get(snap, k, proxy) {
      if (k === _parent) return state.parentProxy

      if (!snap.hasOwnProperty(k)) {
        const descriptor = protoDescriptors[k]

        if (descriptor) {
          const { get, value } = descriptor
          
          if (get) return get.call(proxy)
          if (typeof value === 'function') return value

          recordUsage(state.affected, 'get', snap, k) // record usage, as value may be assigned to state, overriding proto, in the future
          return value
        }
      }

      recordUsage(state.affected, 'get', snap, k)

      let v = Reflect.get(snap, k)
      // return canProxy(v) ? createSnapProxy(v, state) : v
      if (!canProxy(v)) return v

      let child = snapsToProxyCache.get(v)
      const parent = snapsToProxyCache.get(snap)

      if (!child) {
        const proxy = createProxy(v, parent.notify, parent.cache)
      
        parent.orig[k] = proxy
        
        if (v[_module]) {
          v.moduleKeys.forEach(k => {
            const child = v[k]
            const proto = Object.getPrototypeOf(child)
            proto[_parent] = proxy
          })

          v.modulePaths[v.modulePath] = proxy
        }

        v = snapshot(proxy)
        Object.defineProperty(snap, k, { enumerable: true, configurable: true, writable: true, value: v })
      }
      else child.listeners.add(parent.notify) // always add to *set* as proxy may exist in multiple places, therefore child may already exist

      return createSnapProxy(v, state)
    }
  }
}
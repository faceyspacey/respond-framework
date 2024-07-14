import createSnapProxy from '../createSnapProxy.js'
import { canProxy, snapsToProxyCache } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'
import createProxy from '../createProxy.js'
import snapshot from '../snapshot.js'


export default (snap, state, store, isModule, path) => {
  const selectors = isModule && sliceByModulePath(store.selectors, path)

  const proto = Object.getPrototypeOf(snap)
  const protoDescriptors = Object.getOwnPropertyDescriptors(proto)

  return new Proxy(snap, {
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
      if (k === '_state') return state.moduleProxy
      if (k === '_parent') return state.parentProxy

      const selected = trySelector(k, proxy, selectors, state.parentProxy)
      if (selected !== NO_SELECTOR) return selected

      if (!snap.hasOwnProperty(k)) {
        const descriptor = protoDescriptors[k]

        if (descriptor) {
          const { get, value } = descriptor
          return get ? get.call(proxy) : value
        }
      }

      let v = Reflect.get(snap, k)

      recordUsage(state.affected, 'get', snap, k)

      if (!canProxy(v)) return v

      const p = typeof k === 'string' ? (path ? `${path}.${k}` : k) : path

      let child = snapsToProxyCache.get(v)
      const parent = snapsToProxyCache.get(snap)

      if (!child) {
        const proxy = createProxy(v, store, parent.proxy, parent.notify, p)
      
        parent.orig[k] = proxy
        child = { proxy }
        
        v = snapshot(proxy)
        Object.defineProperty(snap, k, { enumerable: true, configurable: true, writable: true, value: v })
      }
      
      proxyStates.get(child.proxy).listeners.add(parent.notify) // always add to *set* as proxy may exist in multiple places, therefore child may already exist

      return createSnapProxy(v, store, state, p)
    }
  })
}



const recordUsage = (affected, trap, snap, k) => {
  let used = affected.get(snap)
  
  if (!used) {
    used = {}
    affected.set(snap, used)
  }

  let set = used[trap]

  if (!set) {
    set = new Set()
    used[trap] = set
  }


  set.add(k)

  if (k === '2') {
    console.log('set', k, set, snap, affected)
    window.affected = affected
    window.snap = snap
  }
}
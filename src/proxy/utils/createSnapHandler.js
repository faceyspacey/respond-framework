import createSnapProxy from '../createSnapProxy.js'
import { canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (snap, state, store, isModule, path) => {
  const selectors = isModule && sliceByModulePath(store.selectors, path)

  const proxy = new Proxy(snap, {
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
      
      // let v = Reflect.get(snap, k)

      let { get, value: v } = Reflect.getOwnPropertyDescriptor(snap, k) ?? {}

      if (get) {
        return isModule ? get.call(state.moduleProxy) : get.call(proxy)
      }
      else if (typeof v === 'function') {
        return isModule ? v.bind(state.moduleProxy) : v.bind(proxy)
      }

      recordUsage(state.affected, 'get', snap, k)

      v ??= Reflect.get(snap, k)

      if (!canProxy(v)) return v

      // const orig = window.proxyStates.get(v)?.orig

      // if (orig) {
      //   const snap = window.snapCache.get(orig)?.snap

      //   if (snap) {
      //     console.log('foundSnap', snap)
      //     v = snap
      //   }
      // }

      const p = typeof k === 'string' ? (path ? `${path}.${k}` : k) : path

      return createSnapProxy(v, store, state, p)
    }
  })

  return proxy
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
import createSnapProxy from '../createSnapProxy.js'
import { canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (snap, state, store, parent, path, moduleProxy, parentProxy) => {
  const isModule = !!store.modulePaths[path]
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
      if (k === '_state') return moduleProxy
      if (k === '_parent') return parentProxy
      if (k === 'crazy') {
        console.log('crazy', moduleProxy, parentProxy)
        return { moduleProxy, parentProxy, state }
      }

      const selected = trySelector(k, proxy, selectors, parent)
      if (selected !== NO_SELECTOR) return selected

      recordUsage(state.affected, 'get', snap, k)
      
      // let v = Reflect.get(snap, k)

      let { get, value: v } = Reflect.getOwnPropertyDescriptor(snap, k) ?? {}

      if (typeof v === 'function') {
        return isModule ? v.bind(moduleProxy) : v.bind(proxy)
      }
      else if (get) {
        return isModule ? get.call(moduleProxy) : get.call(proxy)
      }

      v = Reflect.get(snap, k)

      // const p2 = path ? `${path}.${k}` : k
      // if (!/replayTools/.test(p2)) console.log('record', p2, v, canProxy(v))
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

      return createSnapProxy(v, store, state, p, moduleProxy, parentProxy)
    }
  })

  parentProxy = isModule ? moduleProxy : parentProxy
  moduleProxy = isModule ? proxy : moduleProxy

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

  if (k === 'user2') {
    console.log('set', k, set, snap, affected)
    window.affected = affected
    window.snap = snap
  }
}
import createSnapProxy from '../createSnapProxy.js'
import { canProxy } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (state, store, parent, path) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)

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
      const selected = trySelector(k, proxy, selectors, parent)
      if (selected !== NO_SELECTOR) return selected

      recordUsage(state.affected, 'get', snap, k)
      
      const v = Reflect.get(snap, k)
      if (!canProxy(v)) return v

      const p = typeof k === 'string' ? (path ? `${path}.${k}` : k) : path
      return createSnapProxy(v, store, state, p)
    }
  }
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
}
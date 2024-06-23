import createSnapProxy from '../createSnapProxy.js'
import { GET_ORIGINAL_SYMBOL } from './helpers.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default (state, store, path, parent) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)

  return {
    ownKeys(target) {
      recordUsage(state.affected, 'ownKeys', target)
      return Reflect.ownKeys(target)
    },
    has(target, k) {
      recordUsage(state.affected, 'has', target, k)
      return Reflect.has(target, k)
    },
    getOwnPropertyDescriptor(target, k) {
      recordUsage(state.affected, 'getOwnPropertyDescriptor', target, k)
      return Reflect.getOwnPropertyDescriptor(target, k)
    },
    get(target, k, receiver) {
      if (k === GET_ORIGINAL_SYMBOL) return target
      
      const selected = trySelector(k, receiver, selectors, parent)
      if (selected !== NO_SELECTOR) return selected

      recordUsage(state.affected, 'keys', target, k)
      
      const v = Reflect.get(target, k)
      const p = typeof k === 'string' ? (path ? `${path}.${k}` : k) : path
        
      return createSnapProxy(v, state, store, p)
    }
  }
}



const recordUsage = (affected, trap, target, k) => {
  let used = affected.get(target)

  if (!used) {
    used = {}
    affected.set(target, used)
  }

  let set = used[trap]

  if (!set) {
    set = new Set()
    used[trap] = set
  }

  set.add(k)
}
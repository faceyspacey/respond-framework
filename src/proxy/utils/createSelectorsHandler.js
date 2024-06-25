import createSelectorsProxy from '../createSelectorsProxy.js'
import trySelector, { NO_SELECTOR } from './trySelector.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'
import { canProxy } from './helpers.js'


export default (store, parent, path) => {
  const isModule = !!store.modulePaths[path]
  const selectors = isModule && sliceByModulePath(store.selectors, path)

  return {
    get(target, k, receiver) {
      const selected = trySelector(k, receiver, selectors, parent)
      if (selected !== NO_SELECTOR) return selected

      const v = Reflect.get(target, k)
      if (!canProxy(v)) return v

      const p = typeof k === 'string' ? (path ? `${path}.${k}` : k) : path
        
      return createSelectorsProxy(v, store, receiver, p)
    }
  }
}
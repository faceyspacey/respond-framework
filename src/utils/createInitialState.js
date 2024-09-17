import mergeModels from '../db/utils/mergeModels.js'
import findOne from '../selectors/findOne.js'
import { sliceStoreByModulePath } from './sliceByModulePath.js'


export default (mod, prevStore, topModuleOriginal) => {
  const topModels = !topModuleOriginal.db?.nested && mergeModels(topModuleOriginal.db?.models)
  return createInitialState(mod, prevStore, topModels)
}

const createInitialState = async (mod, prevStore, topModels, path, parentState = {}) => {
  const store = sliceStoreByModulePath(prevStore, path)
  const { topModule } = store

  const initial = mod.initialState
  const initialState = typeof initial === 'function' ? await initial(store) : initial || {}
    
  // topModule.selectors || {}
  const proto = {}

  const { selectors } = topModule 

  Object.keys(selectors ?? {}).forEach(k => {
    const v = selectors[k]
    const descriptor = v.length === 0 ? { get: v, configurable: true } : { value: v, configurable: true }
    Object.defineProperty(proto, k, descriptor)
  })

  Object.defineProperty(proto, 'findOne', { value: findOne })

  Object.defineProperties(proto, {
    findOne: { value: findOne },
    models: { value: topModels || mergeModels(mod.db?.models) },
    __module: { value: true }
  })

  const state = Object.create(proto)

  // Object.assign(state, {
  //   ...initialState,
  //   ...parentState[path], // re-hydrate initialState specified by parent, such as in server-rendered JSON, eg: `<script>window.initialState = { websiteModule: JSON.parse(${JSON.stringify(json)}, respondReviver) }</script>`
  // })

  Object.defineProperties(state, Object.getOwnPropertyDescriptors(initialState ?? {}))
  Object.defineProperties(state, Object.getOwnPropertyDescriptors(parentState[path] ?? {}))
  
  if (topModule.props?.selectors) {
    const { selectors } = topModule.props

    Object.keys(selectors).forEach(k => {
      const v = selectors[k]

      if (v.length === 0) { // getter
        const get = function() {
          return v.call(this._parent)
        }

        Object.defineProperty(proto, k, { get })
      }
      else {
        const value = function(...args) {
          return v.apply(this._parent, args)
        }

        Object.defineProperty(proto, k, { value })
      }
    })
  }

  Object.defineProperty(state, '_parent', { enumerable: false, configurable: true, writable: false, value: parentState })

  const children = await recurseModules(mod, store, topModels, state)
  Object.assign(state, children)

  return state
}




const recurseModules = async (mod, store, topModels, parentState) => {
  if (!mod.modules) return

  const state = {}

  for (const k in mod.modules) {
    const child = mod.modules[k]

    state[k] = await createInitialState(child, store, topModels, k, parentState)
  }
  
  return state
}
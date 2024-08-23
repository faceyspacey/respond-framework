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
  const initialState = typeof initial === 'function' ? await initial(store) : initial
    
  // topModule.selectors || {}
  const proto = {}

  const { selectors } = topModule 

  Object.keys(selectors ?? {}).forEach(k => {
    const v = selectors[k]
    const descriptor = v.length === 0 ? { get: v } : { value: v }
    Object.defineProperty(proto, k, descriptor)
  })

  const state = Object.create(proto)

  // Object.assign(state, {
  //   ...initialState,
  //   ...parentState[path], // re-hydrate initialState specified by parent, such as in server-rendered JSON, eg: `<script>window.initialState = { websiteModule: JSON.parse(${JSON.stringify(json)}, respondReviver) }</script>`
  // })

  Object.defineProperties(state, Object.getOwnPropertyDescriptors(initialState ?? {}))
  Object.defineProperties(state, Object.getOwnPropertyDescriptors(parentState[path] ?? {}))

  state.models = topModels || mergeModels(mod.db?.models)
  state.findOne = findOne
  
  if (topModule.props?.selectors) {
    const descriptors = Object.getOwnPropertyDescriptors(topModule.props.selectors)

    Object.keys(descriptors).forEach(k => {
      const descriptor = descriptors[k]
      const { get, value } = descriptor

      if (get) {
        descriptor.get = function() {
          return get.call(this._parent)
        }
      }
      else if (typeof value === 'function') {
        descriptor.value = function(...args) {
          return value.call(this._parent, ...args)
        }
      }
    })

    Object.defineProperties(proto, descriptors)
  }

  // Object.defineProperty(proto, '_parent', { get() { return parentState } })


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
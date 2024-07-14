import { sliceStoreByModulePath } from './sliceByModulePath.js'


export default async function createInitialState(mod, prevStore, path, parentState = {}) {
  const store = sliceStoreByModulePath(prevStore, path)
  const { topModule } = store

  const initial = mod.initialState
  const initialState = typeof initial === 'function' ? await initial(store) : initial
    
  const proto = topModule.selectorsD || {}
  const state = Object.create(proto)

  Object.assign(state, {
    ...initialState,
    ...parentState[path], // re-hydrate initialState specified by parent, such as in server-rendered JSON, eg: `<script>window.initialState = { websiteModule: JSON.parse(${JSON.stringify(json)}, respondReviver) }</script>`
  })

  if (topModule.props?.selectorsD) {
    const descriptors = Object.getOwnPropertyDescriptors(topModule.props.selectorsD)

    Object.keys(descriptors).forEach(k => {
      const descriptor = descriptors[k]
      const { get, value } = descriptor
      console.log('descriptor', k, descriptor)
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


  const children = await recurseModules(mod, store, state)
  Object.assign(state, children)

  return state
}

const recurseModules = async (mod, store, parentState) => {
  if (!mod.modules) return

  const state = {}

  for (const k in mod.modules) {
    const child = mod.modules[k]

    state[k] = await createInitialState(child, store, k, parentState)
  }
  
  return state
}
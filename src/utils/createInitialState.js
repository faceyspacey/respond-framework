import mergeModels from '../db/utils/mergeModels.js'
import findOne from '../selectors/findOne.js'


export default (mod, store, db) => {
  const topModels = !db?.nested && mergeModels(db?.models)
  return createInitialState(mod, store, topModels)
}

const createInitialState = async (mod, store, topModels, path, parentState = {}) => {
  const proto = {}
  const state = Object.create(proto)

  const { initialState, selectors = {} } = mod
  const initial = typeof initialState === 'function' ? await initialState(store) : initialState

  Object.defineProperties(state, Object.getOwnPropertyDescriptors(initial ?? {}))
  Object.defineProperties(state, Object.getOwnPropertyDescriptors(parentState[path] ?? {}))
  
  // Object.defineProperty(state, 'state', { get: () => state, enumerable: false })
  Object.defineProperty(state, '_parent', { enumerable: false, configurable: true, writable: false, value: parentState }) // NOTE: parentState needs to be made proxy instead

  Object.defineProperties(proto, {
    findOne: { value: findOne },
    models: { value: topModels || mergeModels(mod.db?.models) },
    __module: { value: true }
  })

  Object.keys(selectors).forEach(k => {
    const v = selectors[k]
    const kind = v.length === 0 ? 'get' : 'value'

    Object.defineProperty(proto, k, { [kind]: v, configurable: true })
  })

  if (mod.props?.selectors) {
    const { selectors } = mod.props
    const { reducers = {} } = mod

    Object.keys(selectors).forEach(k => {
      const v = selectors[k]
      const kind = v.length === 0 ? 'get' : 'value'

      const v2 = v.length === 0
        ? function() { return v.call(this._parent) }
        : function(...args) { return v.apply(this._parent, args) }

      Object.defineProperty(proto, k, { [kind]: v2, configurable: true })

      if (reducers[k]) reducers[k].__overridenByProp = true   // delete potential child reducer mock, so selector takes precedence
      delete state[k]                                         // delete potential initialState too
    })
  }

  for (const k of mod.moduleKeys) {
    state[k] = await createInitialState(mod[k], store, topModels, k, state)
  }

  return state
}
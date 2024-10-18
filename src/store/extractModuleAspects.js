import { snapDeepClone } from '../proxy/snapshot.js'
import { isProd } from '../utils.js'
import { moduleApi } from './reserved.js'


export default (mod, state, initialState, currState, moduleKeys) => {
  const events = mod.events ?? {}
  const reducers = mod.reducers ?? {}

  const descriptors = Object.getOwnPropertyDescriptors(mod)

  const selectors = mod.selectors?.__esModule ? { ...mod.selectors } : mod.selectors ?? {}
  const selectorDescriptors = Object.getOwnPropertyDescriptors(selectors)

  Object.keys(descriptors).forEach(k => {
    if (moduleApi[k]) return
    extract(k, descriptors[k], selectorDescriptors, events, reducers, state, moduleKeys)
  })

  mergeInitialState(state, initialState, currState)

  return [events, reducers, selectorDescriptors, moduleKeys]
}




const extract = (k, descriptor, selectorDescriptors, events, reducers, state, moduleKeys) => {
  const { get, value: v } = descriptor
  const isModule = moduleKeys && v?.plugins && v.components && v.id

  if (isModule) {
    moduleKeys.push(k)
  }
  else if (v?.event === true) {
    events[k] = { ...v, __stateKey: k }
    delete events[k].event
  }
  else if (get) {
    selectorDescriptors[k] = descriptor
  }
  else if (typeof v === 'function') {
    if (v.length >= 2) reducers[k] = v
    else selectorDescriptors[k] = descriptor
  }
  else {
    state[k] = cloneDeep(v)
  }
}



const mergeInitialState = async (state, initialState, currState) => {
  const initial = typeof initialState === 'function'
    ? await initialState(currState) 
    : initialState

  if (initial) {
    Object.assign(state, cloneDeep(initial))
  }
}



const cloneDeep = o => isProd ? o : snapDeepClone(o) // clones only needed during development when replayEvents requires non-mutated initial modules/state
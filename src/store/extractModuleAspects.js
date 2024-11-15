import { snapDeepClone } from '../proxy/snapshot.js'
import { isProd } from '../utils.js'
import { isModule, moduleApi } from './reserved.js'
import { extractedEvents } from './createEvents.js'


export default (mod, state, currState = state) => {
  const events = mod.events ? mod.events : {}
  const reducers = mod.reducers ?? {}

  const descriptors = Object.getOwnPropertyDescriptors(mod)

  const selectors = mod.selectors?.__esModule ? { ...mod.selectors } : mod.selectors ?? {}
  const selectorDescriptors = Object.getOwnPropertyDescriptors(selectors)

  Object.keys(descriptors).forEach(k => {
    if (moduleApi[k]) return
    extract(k, descriptors[k], selectorDescriptors, events, reducers, state)
  })

  mergeInitialState(state, mod.initialState, currState)

  return [events, reducers, selectorDescriptors]
}


const extract = (k, descriptor, selectorDescriptors, events, reducers, state) => {
  const { get, value: v } = descriptor

  if (get) {
    selectorDescriptors[k] = descriptor
  }
  else if (!v) {
    state[k] = v
  }
  else if (v[isModule]) {
    return
  }
  else if (v.event === true) {
    events[k] = v
    extractedEvents.set(v, k)
  }
  else if (typeof v === 'function') {
    if (v.length >= 2) reducers[k] = v
    else selectorDescriptors[k] = descriptor
  }
  else {
    state[k] = cloneDeep(v)
  }
}



const mergeInitialState = (state, initialState, currState) => {
  const initial = typeof initialState === 'function'
    ? initialState(currState) 
    : initialState

  if (initial) {
    Object.assign(state, cloneDeep(initial))
  }
}



const cloneDeep = o => isProd ? o : snapDeepClone(o) // clones only needed during development when replayEvents requires non-mutated initial modules/state
import { isModule, moduleApi } from './reserved.js'
import { extractedEvents } from './createEvents.js'


export default (mod, state) => {
  const events = mod.events ?? {}
  const reducers = mod.reducers ?? {}

  const descriptors = Object.getOwnPropertyDescriptors(mod)

  const selectors = mod.selectors?.__esModule ? { ...mod.selectors } : mod.selectors ?? {}
  const selectorDescriptors = Object.getOwnPropertyDescriptors(selectors)

  Object.keys(descriptors).forEach(k => {
    if (moduleApi[k]) return
    extract(k, descriptors[k], selectorDescriptors, events, reducers, state)
  })

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
    state[k] = v
  }
}
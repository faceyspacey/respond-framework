import createProxy from '../proxy/createProxy.js'
import revive  from '../utils/revive.js'
import sliceBranch from '../utils/sliceBranch.js'
import reduce from './plugins/reduce.js'


export default (state, session) => {
  const hydration = revive(state.respond)(session)
  mergeModules(state, hydration)

  if (!state.prevState) { // hmr/session have prevState already
    reduce(state, state.events.init())
  }

  return createProxies(createProxy(state), state.respond.branches)
}

const createProxies = (state, branches, b = '') => {
  state.respond.state = Object.getPrototypeOf(state).state = branches[b] = state
  state.moduleKeys.forEach(k => createProxies(state[k], branches, b ? `${b}.${k}` : k))
  return state
}


function mergeModules(state, hydration = {}) {
  state.moduleKeys.forEach(k => { // depth-first
    if (!hydration[k]) return
    mergeModules(state[k], hydration[k])
    delete hydration[k] // not deleting would overwrite fully created modules; instead delete so a depth-first shallow merge is performed for each module
  })

  Object.assign(state, hydration) // shallow -- user expectation is for state to be exactly what was hydrated (after revival)
}



export function mergeModulesPrevState(state, prevState = {}) {
  state.moduleKeys.forEach(k => {
    mergeModulesPrevState(state[k], prevState[k])
  })

  const prev = Object.create(Object.getPrototypeOf(prevState))
  Object.assign(prev, prevState)

  if (prev.prevState?.prevState) {
    delete prev.prevState.prevState // prevent infinite circular references to prevStates (however: we need 2 prevStates for HMR which hydrates from prevState; otherwise, this would be cut off 1 level sooner)
  }

  state.prevState = prev
}
import createProxy from '../proxy/createProxy.js'
import { snapDeepClone } from '../proxy/snapshot.js'
import reduce from './plugins/reduce.js'


export default (state, session) => {
  let { replayState, seed, prevState, ...sesh } = session

  if (replayState.status === 'session') {
    const [prev, curr] = state.respond.getSessionState()
    reviveModules(state, curr)
    prevState = prev
  }
  else {
    reviveModules(state, snapDeepClone(sesh))
  }

  Object.getPrototypeOf(state).replayState = replayState
  Object.getPrototypeOf(state).seed = seed

  if (prevState) { // hmr/session have prevState already
    mergeModulesPrevState(state, prevState)
  }
  else {
    reduce(state, state.events.init())
  }

  const proxy = createProxy(state, state.respond.subscribers)

  replaceWithProxies(proxy, state.respond.branches)

  return proxy
}



const reviveModules = (state, session) => {
  state.moduleKeys.forEach(k => {                   // depth-first
    if (!session[k]) return
    reviveModules(state[k], session[k])
    delete session[k]                               // delete to prevent overwriting child modules..
  })
  
  Object.assign(state, session)             // ...so parent receives shallow merge of everything except already assign child modules
}



const replaceWithProxies = (state, branches, b = '') => {
  state.respond.state = Object.getPrototypeOf(state).state = branches[b] = state // replace module states with proxy
  state.moduleKeys.forEach(k => replaceWithProxies(state[k], branches, b ? `${b}.${k}` : k))
}



export function mergeModulesPrevState(state, prevState) {
  state.moduleKeys.forEach(k => {
    mergeModulesPrevState(state[k], prevState[k])
  })

  Object.getPrototypeOf(state).prevState = prevState
}



// export function mergeModulesPrevState(state, prevState = {}) {
//   state.moduleKeys.forEach(k => {
//     mergeModulesPrevState(state[k], prevState[k])
//   })

//   const prev = Object.create(Object.getPrototypeOf(prevState))
//   Object.assign(prev, prevState)

//   if (prev.prevState?.prevState) {
//     delete prev.prevState.prevState // prevent infinite circular references to prevStates (however: we need 2 prevStates for HMR which hydrates from prevState; otherwise, this would be cut off 1 level sooner)
//   }

//   state.prevState = prev
// }
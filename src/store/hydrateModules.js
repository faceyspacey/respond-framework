import createProxy from '../proxy/createProxy.js'
import revive  from '../utils/revive.js'
import reduce from './plugins/reduce.js'


export default (state, session) => {
  reviveModules(state, session, session.replayState.status === 'session' && revive(state.respond))

  if (!state.prevState) { // hmr/session have prevState already
    reduce(state, state.events.init())
  }

  const proxy = createProxy(state)

  replaceWithProxies(proxy, state.respond.branches)

  return proxy
}



const reviveModules = (state, session, revive) => {
  state.moduleKeys.forEach(k => {                   // depth-first
    if (!session[k]) return
    reviveModules(state[k], session[k], revive)
    delete session[k]                               // delete to prevent overwriting child modules..
  })
  
  Object.assign(state, revive ? revive(session) : session)             // ...so parent receives shallow merge of everything except already assign child modules
}



const replaceWithProxies = (state, branches, b = '') => {
  state.respond.state = Object.getPrototypeOf(state).state = branches[b] = state // replace module states with proxy
  state.moduleKeys.forEach(k => replaceWithProxies(state[k], branches, b ? `${b}.${k}` : k))
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
import { snapDeepClone } from '../proxy/snapshot.js'
import reduce from './plugins/reduce.js'


export default (state, session) => {
  let { replayState, seed, basenames, prevState, ...sesh } = session

  if (replayState.status === 'session') {
    const [prev, curr] = state.respond.getSessionState()
    reviveModules(state, curr)
    prevState = prev
  }
  else {
    reviveModules(state, snapDeepClone(sesh))
  }

  if (prevState) { // hmr/session have prevState already
    mergePrevState(state, prevState)
  }
  else {
    reduce(state, state.events.init.create())
  }
}



export function mergePrevState(state, prev) {
  state.moduleKeys.forEach(k => mergePrevState(state[k], prev[k]))
  Object.getPrototypeOf(state).prevState = prev
}



const reviveModules = (state, session) => {
  state.moduleKeys.forEach(k => {                   // depth-first
    if (!session[k]) return
    reviveModules(state[k], session[k])
    delete session[k]                               // delete to prevent overwriting child modules..
  })
  
  Object.assign(state, session)             // ...so parent receives shallow merge of everything except already assign child modules
}
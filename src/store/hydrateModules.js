import reduce from './plugins/reduce.js'
import createToken from '../replays/utils/createToken.js'


export default (state, session) => {
  let { replayState, seed, basenames, prevState, ...hydration } = session

  if (replayState.status === 'session') {
    const [prev, curr] = state.respond.getSessionState()
    reviveModules(state, curr)
    prevState = prev
  }
  else {
    state.token = createToken(state.respond) // (top replays just asssigned in finalize) // const createToken = top.replays.createToken ?? defaultCreateToken
    reviveModules(state, hydration) // hydration either server hydration or HMR prevState
  }

  if (prevState) { // hmr/session have prevState already
    mergePrevState(state, prevState)
  }
  else {
    reduce(state, state.events.init())
  }
}



export function mergePrevState(state, prev) {
  state.moduleKeys.forEach(k => mergePrevState(state[k], prev[k]))
  Object.getPrototypeOf(state).prevState = prev
}



const reviveModules = (state, hydration) => {
  state.moduleKeys.forEach(k => {                   // depth-first
    if (!hydration[k]) return
    reviveModules(state[k], hydration[k])
    delete hydration[k]                               // delete to prevent overwriting child modules..
  })
  
  Object.assign(state, hydration)             // ...so parent receives shallow merge of everything except already assign child modules
}
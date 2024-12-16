import reduce from './plugins/reduce.js'
import createToken from '../replays/utils/createToken.js'
import { _parent } from './reserved.js'


export default (state, system) => {
  const { replayState, seed, basenames, ...hydration } = system

  switch (replayState.status) {
    case 'hmr': {
      reviveModules(state, hydration) // hydration is HMR prevState, as last event will be replayed on top of it
      break
    }

    case 'session': {
      const [curr, prev] = state.respond.getSessionState()
      reviveModules(state, curr)
      mergePrevState(state, prev)
      break
    }
      
    case 'replay':
    case 'reload': {
      reviveModules(state, hydration) // hydration is server hydration if available
      state.token = createToken(state.respond)
      reduce(state, state.events.init())
    }
  }
}



export function mergePrevState(state, prev = {}, parent = {}) {
  state.moduleKeys.forEach(k => mergePrevState(state[k], prev[k], prev))
  const proto = Object.getPrototypeOf(state)
  proto.prevState = Object.assign(Object.create(proto), prev, { [_parent]: parent }) // need to create new object because snapshot has Object.preventExtensions
}



const reviveModules = (state, hydration = {}) => {
  state.moduleKeys.forEach(k => {                   // depth-first
    if (!hydration[k]) return
    reviveModules(state[k], hydration[k])
    delete hydration[k]                               // delete to prevent overwriting child modules..
  })
  
  Object.assign(state, hydration)             // ...so parent receives shallow merge of everything except already assign child modules
}
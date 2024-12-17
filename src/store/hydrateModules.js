import { getSessionState } from '../utils/getSessionState.js'
import reduce from './plugins/reduce.js'
import createToken from '../replays/utils/createToken.js'
import { _parent } from './reserved.js'


export default (state, system) => {
  const { replayState, baseState } = system

  switch (replayState.status) {
    case 'hmr': {
      reviveModules(state, baseState) // baseState is HMR prevState, as last event will be replayed on top of it
      break
    }

    case 'session': {
      const [curr, prev] = getSessionState(state.respond)
      reviveModules(state, curr)
      mergePrevState(state, prev)
      break
    }
      
    case 'replay':
    case 'reload': {
      reviveModules(state, baseState) // baseState is standard server hydration if available
      state.token = createToken(state.respond)
      reduce(state, state.events.init())
    }
  }
}




const reviveModules = (state, baseState = {}) => {
  state.moduleKeys.forEach(k => {                   // depth-first
    if (!baseState[k]) return
    reviveModules(state[k], baseState[k])
    delete baseState[k]                               // delete to prevent overwriting child modules..
  })
  
  Object.assign(state, baseState)             // ...so parent receives shallow merge of everything except already assign child modules
}


export function mergePrevState(state, prev = {}, parent = {}) {
  state.moduleKeys.forEach(k => mergePrevState(state[k], prev[k], prev))
  const proto = Object.getPrototypeOf(state)
  proto.prevState = Object.assign(Object.create(proto), prev, { [_parent]: parent }) // need to create new object because snapshot has Object.preventExtensions
}
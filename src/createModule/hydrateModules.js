import { getSessionState } from './helpers/getSessionState.js'
import reduce from './plugins/reduce.js'
import { _parent } from './reserved.js'


export default (state, system) => {
  const { replayState, baseState } = system
  const { status } = replayState

  switch (status) {  
    case 'replay':
    case 'reload': {
      hydrate(state, baseState) // baseState is standard server hydration if available + replayTools
      reduce(state, state.events.init())
    }

    case 'hmr': {
      hydrate(state, baseState) // baseState is HMR prevState + replayTools, as last event will be replayed on top of it
      break
    }

    case 'session': {
      const [curr, prev] = getSessionState(state.respond) // we couldn't getSessionState at the beginning in getSystemState, as we must wait until all models/events are created for reviver to function correctly here
      hydrate(state, curr)
      mergePrevState(state, prev)
      break
    }
  }
}





const hydrate = (state, baseState = {}) => {
  state.moduleKeys.forEach(k => {                   // depth-first
    if (!baseState[k]) return
    hydrate(state[k], baseState[k])
    delete baseState[k]                               // delete to prevent overwriting child modules..
  })
  
  Object.assign(state, baseState)             // ...so parent receives shallow merge of everything except already assign child modules
}



export function mergePrevState(state, prev = {}, parent = {}) {
  state.moduleKeys.forEach(k => mergePrevState(state[k], prev[k], prev))
  const proto = Object.getPrototypeOf(state)
  proto.prevState = Object.assign(Object.create(proto), prev, { [_parent]: parent }) // need to create new object because snapshot has Object.preventExtensions
}
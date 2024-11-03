import revive  from '../utils/revive.js'
import reduce from './plugins/reduce.js'


export default (state, session) => {
  const hydration = revive(state)(session)

  mergeModules(state, hydration)

  state.replayTools.form = state.respond.replayToolsForm

  if (state.prevState) return // hmr + session have prevState + state already populated

  mergeModulesPrevState(state, state.respond.snapshot(state))
  reduce(state, state.events.init())
}


export function mergeModulesPrevState(state, prevState = {}, store) {
  state.moduleKeys.forEach(k => {
    mergeModulesPrevState(state[k], prevState[k], store)
  })

  const prev = Object.create(Object.getPrototypeOf(prevState))
  Object.assign(prev, prevState)

  if (prev.prevState?.prevState) {
    delete prev.prevState.prevState // prevent infinite circular references to prevStates (however: we need 2 prevStates for HMR which hydrates from prevState; otherwise, this would be cut off 1 level sooner)
  }

  state.prevState = prev
}


function mergeModules(state, hydration = {}) {
  state.moduleKeys.forEach(k => {
    if (!hydration[k]) return
    mergeModules(state[k], hydration[k])
    delete hydration[k] // not deleting would overwrite fully created modules; instead delete so a depth-first shallow merge is performed for each module
  })

  Object.assign(state, hydration) // shallow -- user expectation is for state to be exactly what was hydrated (after revival)
}
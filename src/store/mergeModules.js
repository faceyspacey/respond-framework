import revive from '../utils/revive.js'


export function hydrateModules(state, replays) {
  const { token, hydration, hmr } = replays

  state.token = token
  state.cachedPaths ??= {}

  mergeModules(state, revive(state)(hydration))

  if (!hmr) {
    mergeModulesPrevState(state, state.respond.snapshot(state))
  }
}


export function mergeModulesPrevState(state, prevState = {}, store) {
  state.moduleKeys.forEach(k => {
    mergeModulesPrevState(state[k], prevState[k], store)
  })

  const snap = Object.create(Object.getPrototypeOf(prevState))
  Object.assign(snap, prevState)

  if (snap.prevState?.prevState) {
    delete snap.prevState.prevState // prevent infinite circular references to prevStates
  }

  state.prevState = snap
}


function mergeModules(state, hydration = {}) {
  state.moduleKeys.forEach(k => {
    if (!hydration[k]) return
    mergeModules(state[k], hydration[k])
    delete hydration[k] // not deleting would overwrite fully created modules; instead delete so a depth-first shallow merge is performed for each module
  })

  Object.assign(state, hydration) // shallow -- user expectation is for state to be exactly what was hydrated (after revival)
}
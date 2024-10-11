import revive, { createStateReviver } from '../utils/revive.js'


export default function mergeModules(state, json) {
  state.moduleKeys.forEach(k => {
    if (!json[k]) return
    mergeModules(state[k], json[k])
    delete json[k] // not deleting would overwrite fully created modules; instead delete so a depth-first shallow merge is performed for each module
  })

  Object.assign(state, json) // shallow -- user expectation is for state to be exactly what was hydrated (after revival)
}


export const hydrateModules = (state, json, token) => {
  state.token = token
  state.cachedPaths ??= {}

  if (!json) return state

  if (typeof json === 'object') {
    if (json.replayTools.tests) {
      delete json.replayTools.tests
    }

    mergeModules(state, revive(state)(json))
  }
  else {
    mergeModules(state, JSON.parse(json, createStateReviver(state)))
  }

  return state
}


export const mergeModulesPrevState = (state, prevState = {}, store) => {
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
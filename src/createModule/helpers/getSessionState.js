import { isProd } from '../../utils.js'
import sessionStorage from '../../utils/sessionStorage.js'
import { createStateReviver, createReplacer } from './revive.js'


export const getSessionState = respond => {
  const json = sessionStorage.getItem('sessionState')
  if (!json) return []

  const reviver = createStateReviver(respond)

  const curr = JSON.parse(json, reviver)
  const prev = JSON.parse(sessionStorage.getItem('prevState'), reviver)

  return [curr, prev]
}


export const setSessionState = (state, e) => {
  const { replayState, basenames, prevUrl, dbCache, urlCache, system } = state.respond

  sessionStorage.setItem('systemState', JSON.stringify({ replayState, basenames, prevUrl, dbCache, urlCache }))
  sessionStorage.setItem('prevState', JSON.stringify(state.prevState)) // prevState doesn't need replacer, as replacer only handles maintaining object references for duplicate objects in state, which prevState wipes away anyway
  sessionStorage.setItem('sessionState', stringify(state))

  if (isProd) return
  if (e.event.module.id === 'replayTools') return // no need to save latest seed state when triggering events in replayTools

  sessionStorage.setItem('prevSeed', sessionStorage.getItem('seed')) // HMR needs prevSeed to properly replay last event
  sessionStorage.setItem('seed', JSON.stringify(system.seed))
}




const stringify = state => {
  const replacer = createReplacer(state.respond)
  
  if (!state.replayTools) return JSON.stringify(state, replacer)

  const { tests, selectedTestId } = state.replayTools

  state = {
    ...state,
    replayTools: {
      ...state.replayTools,
      tests: selectedTestId ? { [selectedTestId]: tests[selectedTestId] } : undefined, // don't waste cycles on tons of tests with their events -- preserve selected test, as it may be used without the Tests tab first visited
      configs: undefined,         // will be reset to last "checkpoint" by createReplays
      settings: undefined,        // will be reset to last "checkpoint" by createReplays
      focusedbranch: undefined,   // will be reset to last "checkpoint" by createReplays
    }
  }

  return JSON.stringify(state, replacer)
}
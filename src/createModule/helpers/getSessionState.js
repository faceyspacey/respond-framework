import { isProd } from '../../utils.js'
import { createStateReviver, createReplacer } from './revive.js'


export const getSessionState = respond => {
  const json = respond.sessionStorage.getItem('sessionState')
  if (!json) return []

  const reviver = createStateReviver(respond)

  const curr = JSON.parse(json, reviver)
  const prev = JSON.parse(respond.sessionStorage.getItem('prevState'), reviver)

  return [curr, prev]
}


export const setSessionState = (state, e) => {
  const { sessionStorage, replayState, basenames, prevUrl, cache, system } = state.respond

  sessionStorage.setItem('sessionSystemState', JSON.stringify({ replayState, basenames, prevUrl, cache }))
  sessionStorage.setItem('prevState', JSON.stringify(state.prevState)) // prevState doesn't need replacer, as replacer only handles maintaining object references for duplicate objects in state, which prevState wipes away anyway
  sessionStorage.setItem('sessionState', stringify(state))

  if (isProd) return
  if (e.event.module.id === 'replayTools') return // no need to save latest seed state when triggering events in replayTools

  const prevSeed = sessionStorage.getItem('seed')
  if (prevSeed) sessionStorage.setItem('prevSeed', prevSeed) // HMR needs prevSeed to properly replay last event
  
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
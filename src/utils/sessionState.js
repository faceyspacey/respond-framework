import sessionStorage from './sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'
import { isDev, isProd } from './bools.js'
import { createStateReviver, createReplacer } from './revive.js'
import cloneDeep, { cloneDeepModulesOnly } from '../proxy/utils/cloneDeep.js'


export default ({ status, settings, branch = '', hydration } = {}) => {
  const { prevState, respond, replayTools: r } = window.state ?? {}

  const { settings: _, configs: __, ...replayTools } = r ?? {}
  const { tests, selectedTestId, ...rt } = respond?.snapshot(replayTools) ?? {}

  const prt = prevState?.replayTools ?? {}

  let replayState = status === 'hmr'
    ? { ...respond.replayState, lastEvent: rt.evs[rt.evsIndex], status: 'hmr' }
    : { settings, branch, status }

  if (status === 'reload' || status === 'replay') {
    sessionStorage.setItem('seed', null)
  }

  hydration = cloneDeep(hydration)

  switch (status) {
    case 'reload':  return { ...hydration, replayState, replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined } }
    case 'replay':  return { ...hydration, replayState, replayTools: { ...rt, selectedTestId, tests: { [selectedTestId]: tests[selectedTestId] }, evsIndex: -1 } }
    case 'hmr':     return { ...prevState, replayState, replayTools: { ...rt, selectedTestId, tests: { [selectedTestId]: tests[selectedTestId] }, evsIndex: prt.evsIndex, evs: prt.evs, divergentIndex: prt.divergentIndex, playing: false }, seed: JSON.parse(sessionStorage.getItem('prevSeed')) }
  }

  replayState = !isProd && permalinkReplayState()
  if (replayState) return { ...hydration, replayState }

  const system = getSystemStateForSession()
  if (system) return system

  replayState = { settings: undefined, branch: '', status: 'reload' }
  return { ...hydration, replayState }
}



const getSystemStateForSession = () => {
  const sys = sessionStorage.getItem('systemState')
  if (!sys) return // will only exist if sessionState also exists, therefore status === 'session' if exists

  const system = JSON.parse(sys)

  system.seed = JSON.parse(sessionStorage.getItem('seed'))
  system.replayState.status = 'session'

  return system
}






export const getSessionState = respond => {
  const json = sessionStorage.getItem('sessionState')
  if (!json) return

  const reviver = createStateReviver(respond)

  const curr = JSON.parse(json, reviver)
  const prev = JSON.parse(sessionStorage.getItem('prevState'), reviver)

  return [curr, prev]
}


export const saveSessionState = (state, e) => {
  const { replayState, basenames, prevUrl, dbCache, urlCache, session } = state.respond
  const replacer = createReplacer(state.respond)

  sessionStorage.setItem('systemState', JSON.stringify({ replayState, basenames, prevUrl, dbCache, urlCache }))
  sessionStorage.setItem('prevState', JSON.stringify(state.prevState)) // prevState doesn't need replacer, as replacer only handles maintaining object references for duplicate objects in state, which prevState wipes away anyway
  sessionStorage.setItem('sessionState', stringifyState(state, replacer))

  if (e.event.module.id === 'replayTools') return

  sessionStorage.setItem('prevSeed', sessionStorage.getItem('seed')) // HMR needs prevSeed to properly replay last event
  sessionStorage.setItem('seed', JSON.stringify(session.seed))
}




const stringifyState = (state, replacer) => {
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
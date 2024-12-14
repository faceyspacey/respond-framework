import sessionStorage from './sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'
import { isDev, isProd } from './bools.js'
import { createStateReviver, createReplacer } from './revive.js'
import cloneDeep, { cloneDeepModulesOnly } from '../proxy/utils/cloneDeep.js'


export default ({ status, settings, branch = '', hydration } = {}) => {
  const { prevState, prevPrevState, respond, replayTools = {} } = window.state ?? {}
  const { settings: _, configs: __, tests, selectedTestId, ...rt } = respond?.snapshot(replayTools) ?? {}
  const prt = prevState?.replayTools ?? {}

  let replayState = status === 'hmr'
    ? { ...respond.replayState, lastEvent: rt.evs[rt.evsIndex], status: 'hmr' }
    : { settings, branch, status }

  if (status === 'reload' || status === 'replay') {
    sessionStorage.setItem('seed', null)
  }

  switch (status) {
    case 'reload':  return { ...hydration, replayState, replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined } }
    case 'replay':  return { ...hydration, replayState, replayTools: { ...rt, selectedTestId, tests: { [selectedTestId]: tests[selectedTestId] }, evsIndex: -1 } }
    case 'hmr':     return { ...cloneDeepModulesOnly(prevState), replayState, replayTools: { ...replayTools, evs: prt.evs, evsIndex: prt.evsIndex, divergentIndex: prt.divergentIndex, playing: false }, prevState: prevPrevState, seed: JSON.parse(sessionStorage.getItem('prevSeed')) }
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

  const prev = JSON.parse(sessionStorage.getItem('prevState'), reviver)
  const curr = JSON.parse(json, reviver)
  const prevPrev = isDev && JSON.parse(sessionStorage.getItem('prevPrevState'), reviver)

  return [prev, curr, prevPrev]
}


export const saveSessionState = (state, e) => {
  const { replayState, basenames, prevUrl, dbCache, urlCache, session } = state.respond
  const replacer = createReplacer(state.respond)

  if (e.event.module.id !== 'replayTools') {
    sessionStorage.setItem('prevSeed', sessionStorage.getItem('seed')) // HMR needs prevSeed to properly replay last event
    sessionStorage.setItem('seed', JSON.stringify(session.seed))
  }

  sessionStorage.setItem('systemState', JSON.stringify({ replayState, basenames, prevUrl, dbCache, urlCache }))
  if (isDev) sessionStorage.setItem('prevPrevState', sessionStorage.getItem('prevState'))
  sessionStorage.setItem('prevState', JSON.stringify(state.prevState)) // prevState doesn't need replacer, as replacer only handles maintaining object references for duplicate objects in state, which prevState wipes away anyway
  sessionStorage.setItem('sessionState', stringifyState(state, replacer))
}





const stringifyState = (state, replacer) => {
  const s = { ...state }
      
  if (s.replayTools) {
    const { tests, selectedTestId } = s.replayTools
    const t = selectedTestId ? { [selectedTestId]: tests[selectedTestId] } : undefined // preserve selected test, as it may be used without the Tests tab first visited

    s.replayTools = {
      ...s.replayTools,
      tests: t,                   // don't waste cycles on tons of tests with their events  
      settings: undefined,        // will be reset to last "checkpoint" by createReplays
      focusedbranch: undefined,   // will be reset to last "checkpoint" by createReplays
    }
  }
  
  return JSON.stringify(s, replacer)
}
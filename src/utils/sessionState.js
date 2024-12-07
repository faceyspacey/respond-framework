import sessionStorage from './sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'
import { isProd } from './bools.js'
import { createStateReviver, createReplacer } from './revive.js'


export default ({ status, settings, branch = '', hydration } = {}) => {
  const { prevState, prevPrevState, replayTools = {} } = window.state ?? {}
  const { settings: _, configs: __, tests, selectedTestId, ...rt } = replayTools.respond?.snapshot(replayTools) ?? {}
  const prt = prevState?.replayTools ?? {}

  let replayState = status === 'hmr'
    ? { ...prevState.respond.replayState, lastEvent: rt.evs[rt.evsIndex], status: 'hmr' }
    : { settings, branch, status }

  if (status === 'reload' || status === 'replay') {
    sessionStorage.setItem('seed', null)
  }

  switch (status) {
    case 'reload':  return { ...hydration, replayState, replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined } }
    case 'replay':  return { ...hydration, replayState, replayTools: { ...rt, selectedTestId, tests: { [selectedTestId]: tests[selectedTestId] }, evsIndex: -1 } }
    case 'hmr':     return { ...prevState, replayState, replayTools: { ...replayTools, evs: prt.evs, evsIndex: prt.evsIndex, divergentIndex: prt.divergentIndex, playing: false }, prevState: prevPrevState, seed: JSON.parse(sessionStorage.getItem('prevSeed')) }
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
  const jc = sessionStorage.getItem('sessionState')
  if (!jc) return

  const jp = sessionStorage.getItem('prevState')
  const re = createStateReviver(respond)

  const prev = JSON.parse(jp, re)
  const curr = JSON.parse(jc, re)

  return [prev, curr]
}


export const saveSessionState = (e, state) => {
  const { replayState, basenames, dbCache, urlCache, session } = state.respond
  const replacer = createReplacer(state.respond)

  if (e.event.module.id !== 'replayTools') {
    sessionStorage.setItem('prevSeed', sessionStorage.getItem('seed')) // HMR needs prevSeed to properly replay last event
    sessionStorage.setItem('seed', JSON.stringify(session.seed))
  }

  sessionStorage.setItem('systemState', JSON.stringify({ replayState, basenames, dbCache, urlCache }))
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
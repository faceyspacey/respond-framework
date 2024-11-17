import sessionStorage from './sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'
import snapshot from '../proxy/snapshot.js'
import { isProd } from './bools.js'
import { createStateReviver, replacer } from './revive.js'
import { idCounterRef } from './objectIdDevelopment.js'


export default ({ status, settings, branch = '', hydration } = {}) => {
  const { prevState, replayTools = {} } = window.state ?? {}
  const { settings: _, tests, selectedTestId, ...rt } = replayTools
  const prt = prevState?.replayTools ?? {}

  const replayState = status === 'hmr'
    ? { ...prevState.replayState, lastEvent: rt.evs[rt.evsIndex], status: 'hmr' }
    : { settings, branch, idCounterRef, status }

  switch (status) {
    case 'reload':  return { ...hydration, replayState, replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined } }
    case 'replay':  return { ...hydration, replayState, replayTools: { ...rt, selectedTestId, tests: { [selectedTestId]: tests[selectedTestId] }, evsIndex: -1 } }
    case 'hmr':     return { ...prevState, replayState, replayTools: { ...replayTools, evs: prt.evs, evsIndex: prt.evsIndex, divergentIndex: prt.divergentIndex, playing: false } }
  }

  const prs = !isProd && permalinkReplayState()
  if (prs) return { ...hydration, replayState: prs, replayTools: {} }

  const session = sessionStorage.getItem('sessionState')
  if (session) return JSON.parse(session) // JSON.parse(sessionStorage.getItem('preState'))

  const defaultState = { settings: undefined, branch: '', idCounterRef, status: 'reload' }
  return { ...hydration, replayState: defaultState, replayTools: {} }
}



export const parseJsonState = (json, state = {}) => {
  return JSON.parse(json, createStateReviver(state))
}

export const saveSessionState = state => {
  sessionStorage.setItem('sessionState', stringifyState(state))
}


export const parsePreState = json => {
  return JSON.parse(sessionStorage.getItem('preState'))
}

export const saveSessionStateNext = state => {
  const { replayState, __seed, basenames, ...rest } = state

  sessionStorage.setItem('sessionState', stringifyState(rest))
  sessionStorage.setItem('preState', stringifyState({ replayState, __seed, basenames }))
}



const stringifyState = state => {
  const s = { ...snapshot(state) }
      
  if (s.replayTools) {
    const { tests, selectedTestId } = s.replayTools
    const t = selectedTestId ? { [selectedTestId]: tests[selectedTestId] } : undefined // preserve selected test, as it may be used without the Tests tab first visited

    s.replayTools = {
      ...s.replayTools,
      tests: t,                       // don't waste cycles on tons of tests with their events  
      settings: undefined,            // will be reset to last "checkpoint" by createReplays
      branch: undefined,   // will be reset to last "checkpoint" by createReplays
    }
  }

  if (s.prevState?.prevState) {
    s.prevState = { ...s.prevState, prevState: undefined }
  }

  s.replayState = { ...s.replayState, status: 'session' } // GET RID OF THIS!
  
  return JSON.stringify(s, replacer)
}
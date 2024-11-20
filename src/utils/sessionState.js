import sessionStorage from './sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'
import snapshot from '../proxy/snapshot.js'
import { isProd } from './bools.js'
import { createStateReviver, replacer } from './revive.js'
import { idCounterRef } from './objectIdDevelopment.js'


export default ({ status, settings, branch = '', hydration } = {}) => {
  const { prevState, prevPrevState, replayTools = {} } = window.state ?? {}
  const { settings: _, configs: __, tests, selectedTestId, ...rt } = replayTools.respond?.snapshot(replayTools) ?? {}
  const prt = prevState?.replayTools ?? {}

  let replayState = status === 'hmr'
    ? { ...prevState.replayState, lastEvent: rt.evs[rt.evsIndex], status: 'hmr' }
    : { settings, branch, idCounterRef, status }

  switch (status) {
    case 'reload':  return { ...hydration, replayState, replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined } }
    case 'replay':  return { ...hydration, replayState, replayTools: { ...rt, selectedTestId, tests: { [selectedTestId]: tests[selectedTestId] }, evsIndex: -1 } }
    case 'hmr':     return { ...prevState, replayState, replayTools: { ...replayTools, evs: prt.evs, evsIndex: prt.evsIndex, divergentIndex: prt.divergentIndex, playing: false }, prevState: prevPrevState }
  }

  replayState = !isProd && permalinkReplayState()
  if (replayState) return { ...hydration, replayState }

  const pre = getPreState()
  if (pre) return pre

  replayState = { settings: undefined, branch: '', idCounterRef, status: 'reload' }
  return { ...hydration, replayState }
}


const getPreState = () => {
  const pre = sessionStorage.getItem('preState')
  if (!pre) return

  const { seed, replayState } = JSON.parse(pre)
  replayState.status = 'session'
  return { seed, replayState }
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


export const saveSessionState = state => {
  const { seed, replayState } = state
  sessionStorage.setItem('preState', JSON.stringify({ seed, replayState }))
  sessionStorage.setItem('prevState', JSON.stringify(state.prevState, replacer))
  sessionStorage.setItem('sessionState', stringifyState(state))
}





const stringifyState = state => {
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
import sessionStorage from './sessionStorage.js'
import { hashToSettings as permalinkSettings } from '../modules/replayTools/helpers/createPermalink.js'
import snapshot from '../proxy/snapshot.js'
import { isProd } from './bools.js'
import { createStateReviver, replacer as defaultReplacer } from './revive.js'


export default ({ status, settings, focusedModulePath = '', hydration } = {}) => {
  const { prevState, replaySettings: currSets, replayTools: { form: _, tests: __, ...rt } = {} } = window.store ?? {}

  switch (status) {
    case 'reload':  return { ...hydration, replaySettings: settings, focusedModulePath, replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined } }
    case 'replay':  return { ...hydration, replaySettings: settings, focusedModulePath, replayTools: { ...rt, evsIndex: -1 } }
    case 'hmr':     return { ...prevState, replaySettings: currSets, replayTools: { ...prevState.replayTools, tab: rt.tab, open: rt.open }, lastEvent: rt.evs[rt.evsIndex] }
  }

  const perm = !isProd && permalinkSettings()
  if (perm) return { ...hydration, replaySettings: perm, replayTools: {} }

  const session = sessionStorage.getItem('sessionState')
  if (session) return JSON.parse(session)

  return { ...hydration, replaySettings: {}, replayTools: {} }
}



export const parseJsonState = (json, state = {}) => {
  return JSON.parse(json, createStateReviver(state))
}

export const saveSessionState = (state, replacer) => {
  sessionStorage.setItem('sessionState', stringifyState(state, replacer))
}



const stringifyState = (state, replacer = defaultReplacer) => {
  let s = { ...snapshot(state) }
      
  if (s.replayTools) {
    s.replayTools = { ...s.replayTools, tests: undefined } // don't waste cycles on tons of tests with their events
  }

  if (s.prevState?.prevState) {
    s.prevState = { ...s.prevState, prevState: undefined }
  }

  s.replaySettings = { ...s.replaySettings, status: 'session' }
  
  return JSON.stringify(s, replacer)
}
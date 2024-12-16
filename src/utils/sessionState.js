import sessionStorage from './sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'
import { createStateReviver, createReplacer } from './revive.js'
import cloneDeep from '../proxy/utils/cloneDeep.js'


export default (opts = {}) => {
  const { status, settings, branch = '', hydration } = opts
  const { prevState, respond, replayTools } = window.state ?? {}

  switch (status) {
    case 'reload': {
      sessionStorage.setItem('seed', null)

      const { tests, selectedTestId, settings: _, configs: __, ...rt } = respond.snapshot(replayTools)

      return {
        ...cloneDeep(hydration),
        replayState: { settings, branch, status },
        replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined }
      }
    }

    case 'replay': {
      sessionStorage.setItem('seed', null)

      const { tests: t, selectedTestId, settings: _, configs: __, ...rt } = respond.snapshot(replayTools)
      const tests = { [selectedTestId]: t[selectedTestId] }

      return {
        ...cloneDeep(hydration),
        replayState: { settings, branch, status },
        replayTools: { ...rt, selectedTestId, tests, evsIndex: -1 }
      }
    }

    case 'hmr': {
      const { tests: t, selectedTestId, settings: _, configs: __, ...rt } = respond.snapshot(replayTools)
      const tests = { [selectedTestId]: t[selectedTestId] }

      const lastEvent = rt.evs[rt.evsIndex]
      const { evsIndex, evs, divergentIndex } = prevState.replayTools

      return {
        ...prevState,
        seed: JSON.parse(sessionStorage.getItem('prevSeed')),
        replayState: { ...respond.replayState, lastEvent, status },
        replayTools: { ...rt, selectedTestId, tests, evsIndex, evs, divergentIndex, playing: false },
      }
    }
  }

  let permalink, session

  switch (true) {
    // case 'permalink':
    case !!(permalink = permalinkReplayState()): {
      const branch = permalink.branch ?? ''

      return {
        ...cloneDeep(hydration),
        replayState: { settings: permalink, branch, status: 'reload' }
      }
    }

    // case 'session':
    case !!(session = sessionStorage.getItem('systemState')): {
      const system = JSON.parse(session)

      return {
        ...system,
        seed: JSON.parse(sessionStorage.getItem('seed')),
        replayState: { ...system.replayState, status: 'session' },
      }
    }

    // 1st visit/open:
    default: {
      return {
        ...cloneDeep(hydration),
        replayState: { settings: undefined, branch: '', status: 'reload' }
      }
    }
  } 
}






export const getSessionState = respond => {
  const json = sessionStorage.getItem('sessionState')
  if (!json) return

  const reviver = createStateReviver(respond)

  const curr = JSON.parse(json, reviver)
  const prev = JSON.parse(sessionStorage.getItem('prevState'), reviver)

  return [curr, prev]
}


export const setSessionState = (state, e) => {
  const { replayState, basenames, prevUrl, dbCache, urlCache, session } = state.respond
  const replacer = createReplacer(state.respond)

  sessionStorage.setItem('systemState', JSON.stringify({ replayState, basenames, prevUrl, dbCache, urlCache }))
  sessionStorage.setItem('prevState', JSON.stringify(state.prevState)) // prevState doesn't need replacer, as replacer only handles maintaining object references for duplicate objects in state, which prevState wipes away anyway
  sessionStorage.setItem('sessionState', stringify(state, replacer))

  if (e.event.module.id === 'replayTools') return // no need to save latest seed state when triggering events in replayTools

  sessionStorage.setItem('prevSeed', sessionStorage.getItem('seed')) // HMR needs prevSeed to properly replay last event
  sessionStorage.setItem('seed', JSON.stringify(session.seed))
}




const stringify = (state, replacer) => {
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
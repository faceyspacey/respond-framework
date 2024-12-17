import sessionStorage from '../utils/sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'  
import cloneDeep from '../proxy/helpers/cloneDeep.js'


export default (opts = {}) => {
  const { status, settings, branch = '', hydration } = opts
  const { prevState, respond, replayTools } = window.state ?? {}

  switch (status) {
    case 'reload': {
      sessionStorage.setItem('seed', null)

      const { tests, selectedTestId, settings: _, configs: __, ...rt } = respond.snapshot(replayTools)

      return {
        replayState: { settings, branch, status },
        baseState: {
          ...cloneDeep(hydration),
          replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined },
        },
      }
    }

    case 'replay': {
      sessionStorage.setItem('seed', null)

      const { tests: ts, selectedTestId, settings: _, configs: __, ...rt } = respond.snapshot(replayTools)
      const tests = { [selectedTestId]: ts[selectedTestId] }

      return {
        replayState: { settings, branch, status },
        baseState: {
          ...cloneDeep(hydration),
          replayTools: { ...rt, selectedTestId, tests, evsIndex: -1 },
        },
      }
    }

    case 'hmr': {
      const { tests: ts, selectedTestId, settings: _, configs: __, ...rt } = respond.snapshot(replayTools)
      const tests = { [selectedTestId]: ts[selectedTestId] }

      const lastEvent = rt.evs[rt.evsIndex]
      const { evsIndex, evs, divergentIndex } = prevState.replayTools

      return {
        seed: JSON.parse(sessionStorage.getItem('prevSeed')),
        replayState: { ...respond.replayState, lastEvent, status },
        baseState: {
          ...cloneDeep(hydration),
          replayTools: { ...rt, selectedTestId, tests, evsIndex, evs, divergentIndex, playing: false },
        },
      }
    }
  }

  let permalink, session

  switch (true) {
    // case 'permalink':
    case !!(permalink = permalinkReplayState()): {
      const branch = permalink.branch ?? ''

      return {
        replayState: { settings: permalink, branch, status: 'reload' },
        baseState: cloneDeep(hydration),
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
        replayState: { settings: undefined, branch: '', status: 'reload' },
        baseState: cloneDeep(hydration),
      }
    }
  } 
}
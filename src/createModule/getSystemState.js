import sessionStorage from '../utils/sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'  
import cloneDeep from '../proxy/helpers/cloneDeep.js'


export default (opts = {}) => {
  const { status, settings, branch = '', hydration } = opts
  const { prevState, respond, replayTools } = window.state ?? {}
  const rt = replayTools && respond.snapshot(replayTools)

  switch (status) {
    case 'reload': {
      sessionStorage.setItem('seed', null)

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

      return {
        replayState: { settings, branch, status },
        baseState: {
          ...cloneDeep(hydration),
          replayTools: { ...rt, evsIndex: -1 },
        },
      }
    }

    case 'hmr-replay': {
      const lastEvents = rt.evs.slice(0, rt.evsIndex + 1)

      return {
        replayState: { ...respond.replayState, lastEvents, status: 'replay', hmr: true },
        baseState: {
          ...cloneDeep(hydration),
          replayTools: { ...rt, evsIndex: -1 },
        },
      }
    }

    case 'hmr': {
      const lastEvent = rt.evs[rt.evsIndex]
      const { evsIndex, evs, divergentIndex } = prevState.replayTools // set state to previous state, as most recent event will be replayed on top of it

      const { trigger } = lastEvent

      lastEvent.trigger = function(...args) {
        trigger.apply(this, args)
        this.event.respond.render() // dx: so you can just call e.trigger() in userland hmr routine without having to call render
      }

      return {
        seed: JSON.parse(sessionStorage.getItem('prevSeed')),
        replayState: { ...respond.replayState, lastEvent, status, hmr: true },
        baseState: {
          ...prevState,
          replayTools: { ...rt, evsIndex, evs, divergentIndex, playing: false },
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
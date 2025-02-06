import sessionStorageDefault from '../utils/sessionStorage.js'
import { hashToSettings as permalinkReplayState } from '../modules/replayTools/helpers/createPermalink.js'  
import cloneDeep from '../proxy/helpers/cloneDeep.js'


export default (opts = {}) => {
  const { status, settings, branch = '' } = opts
  const { prevState, respond, replayTools } = window.state ?? {}

  const hydration = opts.hydration && typeof opts.hydration === 'string' ? JSON.parse(opts.hydration) : opts.hydration || {}

  const rt = replayTools && respond.snapshot(replayTools)
  const sessionStorage = opts.sessionStorage ?? respond?.sessionStorage ?? sessionStorageDefault

  switch (status) {
    case 'reload': {
      sessionStorage.setItem('seed', null)

      return {
        replayState: { settings, branch, status },
        baseState: {
          ...cloneDeep(hydration),
          replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined, selectedTestId: undefined },
        },
      }
    }

    case 'replay': {
      sessionStorage.setItem('seed', null)

      return {
        replayState: { settings, branch, status },
        baseState: {
          ...cloneDeep(hydration),
          replayTools: { ...rt, evsIndex: -1, evs: [] },
        },
      }
    }

    case 'hmr-replay': {
      sessionStorage.setItem('seed', null)
      
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

      const seed = sessionStorage.getItem('prevSeed')

      return {
        seed: seed ? JSON.parse(seed) : undefined,
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
      const branch = permalink.focusedBranch ?? ''
      delete permalink.focusedBranch

      return {
        replayState: { settings: permalink, branch, status: 'reload' },
        baseState: cloneDeep(hydration) ?? {},
      }
    }

    // case 'session':
    case !!(session = sessionStorage.getItem('sessionSystemState')): {
      const system = JSON.parse(session)
      const seed = sessionStorage.getItem('seed')

      return {
        ...system,
        seed: seed ? JSON.parse(seed) : undefined,
        replayState: { ...system.replayState, status: 'session' },
        baseState: {},
      }
    }

    // case 'visit':
    default: {
      return {
        replayState: { settings, branch: '', status: 'reload' },
        baseState: cloneDeep(hydration) ?? {},
      }
    }
  } 
}
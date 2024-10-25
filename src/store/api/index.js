import sessionStorage from '../../utils/sessionStorage.js'

import dispatch from './dispatch.js'
import dispatchSync from './dispatchSync.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import render from '../../react/render.js'

import history from '../../history/index.js'
import createDevtools from '../../devtools/index.mock.js'
import createCache from '../../utils/createCache.js'

import { isTest, isProd, kinds} from '../../utils.js'
import { createStateReviver, replacer } from '../../utils/revive.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import { sliceEventByModulePath, traverseModules } from '../../utils/sliceByModulePath.js'
import findInClosestAncestor from '../../utils/findInClosestAncestor.js'


export default (top, state, replays) => {
  const modulePaths = { ['']: state, undefined: state }
  const listeners = []
  const promises = []

  const ctx = window.store?.ctx ?? {}

  const { cookies, modulePath: replayModulePath } = replays
  state.replays = replays

  return {
    top,
    replays: state.replays,
    cookies,
    ctx,
    state,
  
    modulePaths,
    modulePathsById: {},
    modelsByModulePath: {},
  
    eventsByPath: {},
    eventsByType: {},
  
    listeners,
    promises,
    refs: {},
    eventsCache: new Map,
    overridenReducers: new Map,
  
    history,
    devtools: createDevtools(),
    cache: createCache(state),

    kinds,
  
    dispatch,
    dispatchSync,
  
    fromEvent,
    eventFrom,
  
    snapshot,
    render,

    addToCache,
    addToCacheDeep,
  
    getStore() {
      return state
    },
  
    saveSessionState() {
      sessionStorage.setItem('sessionState', this.stringifyState())
    },
    stringifyState() {
      let s = snapshot(state)
      
      if (s.replayTools?.tests && s.replayTools.tab !== 'tests') {
        s = { ...s, replayTools: { ...s.replayTools, tests: {} } } // don't waste cycles on tons of tests with their events
      }

      if (s.prevState?.prevState) {
        delete s.prevState.prevState // HMR requires/keeps 2 levels, but sessionState does not
      }

      return JSON.stringify(s, this.options.replacer ?? replacer)
    },
    parseJsonState(json) {
      return JSON.parse(json, createStateReviver(state))
    },
  
    shouldAwait() {
      return this.ctx.isFastReplay || isTest
    },
    awaitInReplaysOnly(f) {
      return this.shouldAwait() ? f() : promises.push(f()) // f is async
    },
    async promisesCompleted(e) {
      await Promise.all(promises)
      promises.length = 0
      ctx.changedPath = !e.meta.pop ? false : ctx.changedPath
      this.queueSaveSession()
    },

    queueSaveSession() {
      if (isProd || isTest) return
      if (ctx.saveQueued || this.replays.playing) return
      if (window.state !== state) return // new store created

      ctx.saveQueued = true

      setTimeout(() => {
        requestAnimationFrame(() => {
          this.saveSessionState()
          ctx.saveQueued = false
        })
      }, 500)
    },
  
    isEqualNavigations(a, b) {
      return a && b && this.respond.fromEvent(a).url === this.respond.fromEvent(b).url
    },

    changeBasename(basename) {
      let prevBasename = this.respond.state.basename ?? ''
      this.respond.state.basename = basename

      traverseModules(this.respond.state, store => {
        prevBasename += store.basename
        basename += store.basename
        store.basename.replace(prevBasename, basename)
      })

      const { eventsByPath } = this.respond
      const next = {}

      Object.keys(eventsByPath).forEach(prevPath => {
        const event = eventsByPath[prevPath]

        const { basename } = event.module
        const path = basename ? `${basename}${event.path}` : event.path

        next[path] = event

        delete eventsByPath[prevPath]
      })

      Object.assign(eventsByPath, next)

      const e = this.respond.getStore().replayTools.findLastEvent
      this.respond.changePath(e, true)
    },
  
    findInClosestAncestor(key, modulePath) {
      modulePath = replayModulePath
        ? modulePath ? replayModulePath + '.' + modulePath : replayModulePath
        : modulePath

      return findInClosestAncestor(key, modulePath, this.respond.top)
    },
  
    subscribe(send) {
      send.modulePath = this.respond.state.modulePath // modulePath of module attached to `respond` object unique to each module
      listeners.push(send)
    
      return () => {
        const index = listeners.findIndex(l => l === send)
        listeners.splice(index, 1)
      }
    },
    
    notify(e) {  
      if (e.event.sync) return
      if (e.event === state.events.start) return

      const sent = listeners
        .filter(send => e.modulePath.indexOf(send.modulePath) === 0) // event is child of subscribed module or the same module
        .map(send => {
          const p = send.modulePath
          const mod = modulePaths[p]
          const eMod = sliceEventByModulePath(e, p)
          send(mod, eMod)
        })

      if (sent.length === 0) return
    
      const promise = Promise.all(sent).catch(error => {
        state.onError({ error, kind: 'subscriptions', e })
      })
    
      if (state.shouldAwait()) return promise
    },
  
    onError(err)  {
      const { error, kind = 'unknown', e } = err
    
     if (kind !== 'render') { // react render errors already logged
      console.error('respond: ' + kind, e || '')
      console.error(error)
     }
    
      const onError = this.respond.state.options.onError ?? state.options.onError

      return onError?.({ ...err, store: state })
    }
  }
}
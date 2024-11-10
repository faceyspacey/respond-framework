import dispatch from './dispatch.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import render from '../../react/render.js'

import defaultCreateDevtools from '../../devtools/index.mock.js'
import defaultCreateHistory from '../../history/index.js'
import defaultCreateCookies from '../../cookies/index.js'

import { isTest, isProd, kinds} from '../../utils.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import { createModulePathsAll } from '../../replays/index.js'
import { sliceEventByModulePath, traverseModuleChildren } from '../../utils/sliceByModulePath.js'
import findInClosestAncestor from '../../utils/findInClosestAncestor.js'
import { parseJsonState, saveSessionState } from '../../utils/sessionState.js'


export default (top, state, focusedModulePath) => {
  const modulePathsAll = createModulePathsAll(top)
  const modulePaths = { ['']: state, undefined: state }
  const listeners = []
  const promises = []

  const ctx = window.state?.ctx ?? {}

  const {
    createDevtools = defaultCreateDevtools,
    createHistory = defaultCreateHistory,
    createCookies = defaultCreateCookies,
    ...options
  } = top.options ?? {}

  return {
    top,
    ctx,
    state, 

    modulePathsAll,
    
    modulePaths,
    modulePathsById: {},
    modelsByModulePath: {},

    eventsByPath: {},
    eventsByType: {},
  
    listeners,
    promises,
    refs: {},
    eventsCache: new Map,
  
    devtools: createDevtools(),
    history: createHistory(),
    cookies: createCookies(),

    kinds,
  
    dispatch,
  
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
      return saveSessionState(state, this.options.replacer)
    },

    parseJsonState(json) {
      return parseJsonState(json, state)
    },
  
    shouldAwait() {
      return this.ctx.isFastReplay || isTest
    },
    awaitInReplaysOnly(f, onError) {           
      const promise = typeof f === 'function' ? f() : f   // can be function
      if (!(promise instanceof Promise)) return

      if (this.shouldAwait()) {
        return promise.then(_ => undefined).catch(onError) // ensure consistent undefined return, as we dont want `false` to stop dispatch pipeline if accidentally returned, as the expectation is to continue to the next plugin in production without stopping
      }
      else {
        promises.push(promise.catch(onError))
      }
    },
    async promisesCompleted(e) {
      await Promise.all(promises)
      promises.length = 0
      ctx.changedPath = !e.meta.pop ? false : ctx.changedPath
      this.queueSaveSession()
    },

    queueSaveSession() {
      if (isProd || isTest) return
      if (ctx.saveQueued || state.replayTools?.playing) return
      if (window.state !== state) return // new state created

      ctx.saveQueued = true

      setTimeout(() => {
        requestAnimationFrame(() => {
          this.saveSessionState()
          ctx.saveQueued = false
        })
      }, 500)
    },
  
    isEqualNavigations(a, b) {
      if (!a || !b) return false
      if (a.event !== b.event) return false
      if (a.kind !== kinds.navigation) return false
      return this.respond.fromEvent(a).url === this.respond.fromEvent(b).url
    },

    changeBasename(basename) {
      const e = this.respond.eventFrom(window.location.href)
      const { state } = this.respond

      const prevBasename = state.basename
      const prevBasenameFull = state.basenameFull
      
      state.basename = basename
      state.basenameFull = prevBasenameFull.replace(new RegExp(prevBasename + '$'), basename)

      traverseModuleChildren(state, (state, parent) => {
        state.basenameFull = parent.basenameFull + state.basename
      })

      const { eventsByPath } = this.respond
      const next = {}

      Object.keys(eventsByPath).forEach(prev => {
        const event = eventsByPath[prev]
        const path = event.module.basenameFull + event.path
        next[path] = event
        delete eventsByPath[prev]
      })

      Object.assign(eventsByPath, next)

      this.respond.history.changePath(e, true)
      this.respond.queueSaveSession()
    },
  
    findInClosestAncestor(key, modulePath) {
      modulePath = focusedModulePath
        ? modulePath ? focusedModulePath + '.' + modulePath : focusedModulePath
        : modulePath

      return findInClosestAncestor(key, modulePath, this.respond.top)
    },
  
    subscribe(send) {
      send.module = this.respond.state
      send.modulePath = this.respond.state.modulePath // modulePath of module attached to `respond` object unique to each module
      
      const mp = send.modulePath
      
      const sendOuter = send.length < 2 || !mp
        ? send
        : (state, e) => send(state, sliceEventByModulePath(e, mp))

      listeners.push(sendOuter)
    
      return () => {
        const index = listeners.findIndex(l => l === sendOuter)
        listeners.splice(index, 1)
      }
    },
    
    notify(e) {  
      this.respond.devtools.send(e)

      const { event } = e

      if (event.sync && !event.notify) return
      if (event === state.events.init) return

      const sent = listeners
        .filter(send => e.modulePath.indexOf(send.modulePath) === 0) // event is child of subscribed module or the same module
        .map(send => send(send.module, e))

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

      return onError?.({ ...err, state })
    }
  }
}
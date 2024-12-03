import dispatch, { trigger } from './dispatch.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import subscribeAll from '../../proxy/subscribeAll.js'
import render from '../../react/render.js'

import defaultCreateDevtools from '../../devtools/index.mock.js'
import defaultCreateHistory from '../../history/index.js'
import defaultCreateCookies from '../../cookies/index.js'

import findInClosestAncestor, { findClosestAncestorWith } from '../../utils/findInClosestAncestor.js'

import { isTest, isProd, kinds} from '../../utils.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import { traverseModuleChildren } from '../../utils/sliceBranch.js'
import { getSessionState, saveSessionState } from '../../utils/sessionState.js'
import { branch as branchSymol } from '../reserved.js'


export default (top, session, branchesAll, focusedModule) => {
  const { replayState, seed, basenames = {} } = session
  const focusedBranch = focusedModule.branchAbsolute
  
  const branches = { get undefined() { return this[''] } }
  const listeners = []
  const promises = []

  const prev = window.state?.respond

  const ctx = prev?.ctx ?? {}
  ctx.rendered = false

  const {
    createDevtools = defaultCreateDevtools,
    createHistory = defaultCreateHistory,
    createCookies = defaultCreateCookies,
    ...options
  } = top.options ?? {}

  const getStore = () => branches['']

  const reuseEvents = prev?.focusedBranch === focusedBranch

  const eventsByPattern = {}
  function Respond(props) {
    Object.assign(this, props)
    this.overridenReducers = new Map
  }

  Respond.prototype = {
    top,
    ctx,
    prev: window.state?.respond,

    session,

    hmr: replayState.status === 'hmr',

    reuseEvents,

    prevEventsByType: reuseEvents ? prev.eventsByType : {},
    eventsByType: {},

    replayState,
    seed,
    basenames,

    devtools: createDevtools(),
    history: createHistory(),
    cookies: createCookies(),

    focusedModule,
    focusedBranch,

    branchesAll,
    
    branches,
    branchLocatorsById: {},

    modelsByBranch: {},
    modelsByBranchType: {},

    eventsByPattern,

    listeners,
    promises,
    refs: {},
    eventsCache: new Map,

    kinds,
  
    dispatch,
    trigger,

    fromEvent,
    eventFrom,
  
    subscribers: new WeakMap,
    refIds: new WeakMap,
    snapshot,
    subscribeAll,

    render,

    addToCache,
    addToCacheDeep,
  
    getStore,

    replaceWithProxies: function replaceWithProxies(proxy, b = '') {
      proxy.respond.state = Object.getPrototypeOf(proxy).state = branches[b] = proxy // replace module states with proxy
      proxy.moduleKeys.forEach(k => replaceWithProxies(proxy[k], b ? `${b}.${k}` : k))
    },
    
    saveSessionState() {
      const snap = this.snapshot(getStore())
      return saveSessionState(snap)
    },

    getSessionState() {
      return getSessionState(this)
    },
  
    awaitInReplaysOnly(f, onError) {           
      const promise = typeof f === 'function' ? f() : f // can be function
      if (!(promise instanceof Promise)) return
      promises.push(promise.catch(onError))
    },
    async promisesCompleted(e) {
      await Promise.all(promises)
      promises.length = 0
      ctx.changedPath = false
      this.queueSaveSession()
    },

    queueSaveSession() {
      if (isProd || isTest) return
      if (ctx.saveQueued || getStore().replayTools?.playing) return
      if (window.state !== getStore()) return // ensure replayEvents saves new state

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
      if (b.kind !== kinds.navigation) return false
      if (!a.event.pattern || !a.event.pattern) return false
      return this.fromEvent(a).url === this.fromEvent(b).url
    },

    changeBasename(basename) {
      const e = this.eventFrom(window.location.href)
      const { state, branch } = this

      const prevBasename = state.basename
      const prevBasenameFull = state.basenameFull
      
      state.basename = basenames[branch] = basename
      state.basenameFull = prevBasenameFull.replace(new RegExp(prevBasename + '$'), basename)

      traverseModuleChildren(state, (state, parent) => {
        state.basenameFull = parent.basenameFull + state.basename
      })

      const next = {}

      Object.keys(eventsByPattern).forEach(prev => {
        const event = eventsByPattern[prev]
        const pattern = event.module.basenameFull + event.pattern
        next[pattern] = event
        delete eventsByPattern[prev]
      })

      Object.assign(eventsByPattern, next)

      this.history.changePath(e, true)
      this.queueSaveSession()
    },
  
    findInClosestAncestor(key, b) {
      const b2 = focusedBranch ? (b ? focusedBranch + '.' + b : focusedBranch) : b
      return findInClosestAncestor(key, b2, top)
    },

    findClosestAncestorWith(key, b) {
      const b2 = focusedBranch ? (b ? focusedBranch + '.' + b : focusedBranch) : b
      return findClosestAncestorWith(key, b2, top)
    },
  
    subscribe(send) {
      send.module = this.state
      send.branch = this.state.branch // branch of module attached to `respond` object unique to each module

      listeners.push(send)
    
      return () => {
        const index = listeners.findIndex(l => l === send)
        listeners.splice(index, 1)
      }
    },
    
    notify(e) {  
      this.devtools.send(e)

      const { event } = e

      if (event.sync && !event.notify) return
      if (event === this.state.events.init) return

      const sent = listeners
        .filter(send => e.event[branchSymol].indexOf(send.branch) === 0) // event is child of subscribed module or the same module
        .map(send => send(send.module, e))

      if (sent.length > 0) promises.push(sent)
    },
  
    onError(err)  {
      const { error, kind = 'unknown', e } = err
    
      if (kind !== 'render') { // react render errors already logged
        console.error('respond: ' + kind, e || '')
        console.error(error)
      }

      const eventOnError = e.event?.onError
      if (eventOnError) return eventOnError({ ...err, state: e.event.state })

      const ownOnError = this.state.options.onError
      if (ownOnError) return ownOnError({ ...err, state: this.state })

      const state = getStore()
      return state.options.onError?.({ ...err, state })
    }
  }

  return Respond
}
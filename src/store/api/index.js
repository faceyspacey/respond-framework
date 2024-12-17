import dispatch, { trigger } from './dispatch.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import render from '../../react/render.js'

import defaultCreateHistory from '../../history/index.js'
import defaultCreateCookies from '../../cookies/index.js'

import { commit } from '../../proxy/utils/queueNotification.js'
import { isTest, isProd, kinds} from '../../utils.js'
import { _branch } from '../reserved.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import { setSessionState } from '../../utils/getSessionState.js'
import { createDb, createApiHandler } from '../../db/callDatabase.js'
import createDbCache from '../../db/utils/createDbCache.js'
import createUrlCache from '../createUrlCache.js'
import createProxy from '../../proxy/createProxy.js'
import createAncestors from '../helpers/createAncestors.js'
import changeBasename from './changeBasename.js'
import replaceWithProxies from '../helpers/replaceWithProxies.js'


export default (top, system, branchesAll, focusedModule) => {
  const { replayState, prevUrl, basenames = {} } = system
  const focusedBranch = focusedModule.branchAbsolute

  const prev = window.state?.respond
  const apiHandler = createApiHandler({ db: top.db, log: false })

  const {
    createHistory = defaultCreateHistory,
    createCookies = defaultCreateCookies,
    ...options
  } = top.options ?? {}

  function Respond(props) {
    Object.assign(this, props)
    
    this.listeners = new Set
    this.overridenReducers = new Map
    this.responds[this.branch] = this
    this.snapshot = snapshot.bind(this)
    this.ancestors = createAncestors(this.branch)
    this.db = createDb(this)
  }

  Respond.prototype = {
    top,
    prev,
    system,

    replayState,
    basenames,
    prevUrl,

    focusedModule,
    focusedBranch,

    branchesAll,
    kinds,

    hmr: replayState.status === 'hmr',
    reuseEvents:      prev?.focusedBranch === focusedBranch,

    prevEventsByType: prev?.focusedBranch === focusedBranch ? prev.eventsByType : {},
    branches: { get undefined() { return this[''] } },
    mem: { ...prev?.mem, rendered: false },
    ctx: {},
    branchLocatorsById: {},
    modelsByBranchType: {},
    eventsByType: {},
    eventsByPattern: {},
    responds: {},
    refs: {},

    subscribers: [],
    promises: [],

    eventsCache: new Map,
    versionListeners: new WeakMap,
    refIds: isProd ? new WeakMap : new Map, // enable peaking inside map during development
  
    dispatch,
    trigger,

    fromEvent,
    eventFrom,
  
    changeBasename,

    render,
    commit,
    
    addToCache,
    addToCacheDeep,
  
    devtools: new Proxy({}, { get: () => () => undefined }),

    history: createHistory(),
    cookies: createCookies(),

    dbCache: createDbCache(system.dbCache),
    urlCache: createUrlCache(system.urlCache, fromEvent),

    get topState() {
      return this.branches['']
    },

    async apiHandler(req, res) {
      await this.simulateLatency()
      return apiHandler(req, res)
    },

    proxify() {
      const proxy = createProxy(this.branches[''], this.versionListeners, this.refIds)
      replaceWithProxies(proxy)
      return window.state = proxy
    },
  
    listen(callback) {
      this.listeners.add(callback)
      return () => this.listeners.delete(callback)
    },

    subscribe(send, triggerOnly = true) {
      send.module = this.state
      send.branch = this.state.branch // branch of module attached to `respond` object unique to each module
      send.triggerOnly = triggerOnly
      
      this.subscribers.push(send)
    
      return () => {
        const index = this.subscribers.findIndex(l => l === send)
        this.subscribers.splice(index, 1)
      }
    },
    
    notify(e) {  
      // this.devtools.send(e)

      const { event } = e

      if (event.sync && !event.notifyReduce) return // by default sync events don't trigger notifyReduce
      if (event === this.state.events.init) return

      const sent = this.subscribers
        .filter(send =>
          e.event[_branch].indexOf(send.branch) === 0 && // event is child of subscribed module or the same module
          !send.triggerOnly || e.meta.trigger
        )
        .map(send => send(send.module, e))

      if (sent.length > 0) this.promises.push(...sent)
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

      const state = this.branches['']
      return state.options.onError?.({ ...err, state })
    },

    simulateLatency() {
      if (isTest || this.mem.isFastReplay || !this.options.simulatedApiLatency) return
      return timeout(this.options.simulatedApiLatency)
    },

    awaitInReplaysOnly(f, onError) {           
      const promise = typeof f === 'function' ? f() : f // can be function
      if (!(promise instanceof Promise)) return
      this.promises.push(promise.catch(onError))
    },
    
    async promisesCompleted(e) {
      await Promise.all(this.promises)

      this.promises.length = 0
      this.lastTriggerEvent = e // seed will only be saved if not an event from replayTools
      this.queueSaveSession()
    },
    
    queueSaveSession() {
      if (isProd || isTest) return
      if (this.mem.saveQueued || this.branches.replayTools?.playing) return
      if (window.state !== this.branches['']) return // ensure replayEvents saves new state instead of old state when recreating state for replays

      this.mem.saveQueued = true

      setTimeout(() => {
        const snap = this.snapshot(this.branches[''])
        setSessionState(snap, this.lastTriggerEvent)
        this.mem.saveQueued = false
      }, 1000)
    },
  
    isEqualNavigations(a, b) {
      if (!a || !b) return false
      if (a.event !== b.event) return false
      if (a.kind !== kinds.navigation) return false
      if (b.kind !== kinds.navigation) return false
      if (!a.event.pattern || !a.event.pattern) return false

      return this.fromEvent(a).url === this.fromEvent(b).url
    },
  }

  return Respond
}
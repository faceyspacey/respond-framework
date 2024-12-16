import dispatch, { trigger } from './dispatch.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import listen from '../../proxy/listen.js'
import render from '../../react/render.js'

import defaultCreateDevtools from '../../devtools/index.mock.js'
import defaultCreateHistory from '../../history/index.js'
import defaultCreateCookies from '../../cookies/index.js'

import findInClosestAncestor, { findClosestAncestorWith } from '../../utils/findInClosestAncestor.js'

import { isTest, isProd, kinds} from '../../utils.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import { isChildOrSelf, traverseModuleChildren } from '../../utils/sliceBranch.js'
import { getSessionState, setSessionState } from '../../utils/getSessionState.js'
import { _parent, branch as branchSymol } from '../reserved.js'
import createDbCache from '../../db/utils/createDbCache.js'
import createUrlCache from '../createUrlCache.js'
import callDatabase, { createApiHandler } from '../../db/callDatabase.js'
import { ObjectId } from 'bson'
import objectIdDevelopment from '../../utils/objectIdDevelopment.js'
import createProxy from '../../proxy/createProxy.js'
import { commit } from '../../proxy/utils/queueNotification.js'


export default (top, system, branchesAll, focusedModule) => {
  const { replayState, prevUrl, basenames = {} } = system
  const focusedBranch = focusedModule.branchAbsolute
  
  const branches = { get undefined() { return this[''] } }
  const subscribers = []
  const promises = []

  const prev = window.state?.respond

  const mem = prev?.mem ?? {}
  mem.rendered = false

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
    this.mod.id ??= this.generateId()
    
    const get = (_, table) => {
      const get = (_, method) => this.callDatabase(table, method)
      return new Proxy({}, { get })
    }

    this.db = new Proxy({}, { get })

    this.listeners = new Set

    let b = ''
    this.ancestors = !this.branch
      ? ['']
      : ['', ...this.branch.split('.').map(k =>  b = b ? b + '.' + k : k)].reverse()
    
    this.responds[this.branch] = this

    this.snapshot = snapshot.bind(this)
  }

  const apiHandler = createApiHandler({ db: top.db, log: false })

  Respond.prototype = {
    build(deps) {
      (this.mod.build ?? this.props.build)?.(deps)
    },
    buildAfter(deps) {
      (this.mod.buildAfter ?? this.props.buildAfter)?.(deps)
      this.assignRenderingDependencies(deps)
    },
    
    assignRenderingDependencies({ branch, parent }) {
      const { ignoreParents, dependsOnAllAncestors, dependsOnParent } = this

      if (!ignoreParents) {
        if (dependsOnAllAncestors) {
          this.dependedBranch = '' 
          this.branchDiff = branch
        }
        else if (dependsOnParent) {
          this.dependedBranch = parent.respond.branch
          this.branchDiff = this.moduleName
        }
      }

      this.ancestorsListening = {} // includes self

      for (const b of this.ancestors) {
        const respond = this.responds[b]
        const dependedBranch = respond.dependedBranch ?? respond.branch

        this.ancestorsListening[dependedBranch] = true
        
        if (this.responds[b].ignoreParents) break
      }
    },

    callDatabase,
    async apiHandler(req, res) {
      await this.simulateLatency()
      return apiHandler(req, res)
    },

    dbCache: createDbCache(system.dbCache),
    urlCache: createUrlCache(system.urlCache, fromEvent),

    top,

    mem,
    ctx: {},

    prev: window.state?.respond,

    system,

    hmr: replayState.status === 'hmr',

    reuseEvents,

    prevEventsByType: reuseEvents ? prev.eventsByType : {},
    eventsByType: {},

    replayState,
    basenames,
    prevUrl,
    
    devtools: createDevtools(),
    history: createHistory(),
    cookies: createCookies(),

    focusedModule,
    focusedBranch,

    branchesAll,
    
    branches,
    branchLocatorsById: {},

    modelsByBranchType: {},

    eventsByPattern,

    responds: {},
    subscribers,
    promises,
    refs: {},
    eventsCache: new Map,

    kinds,
  
    dispatch,
    trigger,

    fromEvent,
    eventFrom,
  
    versionListeners: new WeakMap,
    refIds: isProd ? new WeakMap : new Map, // enable peaking inside map during development
    listen,

    render,

    addToCache,
    addToCacheDeep,
  
    getStore,

    proxify() {
      const proxy = createProxy(branches[''], this.versionListeners, this.refIds)
      this.replaceWithProxies(proxy)
      return window.state = proxy
    },

    replaceWithProxies: function replaceWithProxies(proxy, parent = {}, b = '') {
      const proto = Object.getPrototypeOf(proxy)
      proto[_parent] = parent

      proxy.respond.state = branches[b] = proxy // replace module states with proxy
      proxy.moduleKeys.forEach(k => replaceWithProxies(proxy[k], proxy, b ? `${b}.${k}` : k))
    },

    getSessionState() {
      return getSessionState(this)
    },
  
    simulateLatency() {
      if (isTest || this.mem.isFastReplay || !this.options.simulatedApiLatency) return
      return timeout(this.options.simulatedApiLatency)
    },

    awaitInReplaysOnly(f, onError) {           
      const promise = typeof f === 'function' ? f() : f // can be function
      if (!(promise instanceof Promise)) return
      promises.push(promise.catch(onError))
    },
    async promisesCompleted(e) {
      await Promise.all(promises)
      promises.length = 0
      this.lastTriggerEvent = e // seed will only be saved if not an event from replayTools
      this.queueSaveSession()
    },

    commit() {
      commit(this)
    },
    
    queueSaveSession() {
      if (isProd || isTest) return
      if (mem.saveQueued || getStore().replayTools?.playing) return
      if (window.state !== getStore()) return // ensure replayEvents saves new state instead of old state when recreating state for replays

      mem.saveQueued = true

      setTimeout(() => {
        requestAnimationFrame(() => {
          const snap = this.snapshot(getStore())
          const e = this.lastTriggerEvent

          setSessionState(snap, e)

          mem.saveQueued = false
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

    generateId() {
      return isProd ? new ObjectId().toString() : objectIdDevelopment()
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

      this.history.changePath(e)
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
  
    subscribe(send, triggerOnly = true) {
      send.module = this.state
      send.branch = this.state.branch // branch of module attached to `respond` object unique to each module
      send.triggerOnly = triggerOnly
      
      subscribers.push(send)
    
      return () => {
        const index = subscribers.findIndex(l => l === send)
        subscribers.splice(index, 1)
      }
    },
    
    notify(e) {  
      this.devtools.send(e)

      const { event } = e

      if (event.sync && !event.notifyReduce) return // by default sync events don't trigger notifyReduce
      if (event === this.state.events.init) return

      const sent = subscribers
        .filter(send =>
          e.event[branchSymol].indexOf(send.branch) === 0 && // event is child of subscribed module or the same module
          !send.triggerOnly || e.meta.trigger
        )
        .map(send => send(send.module, e))

      if (sent.length > 0) promises.push(...sent)
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
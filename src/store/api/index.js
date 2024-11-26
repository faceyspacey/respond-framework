import dispatch from './dispatch.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import subscribeAll from '../../proxy/subscribeAll.js'
import render from '../../react/render.js'

import defaultCreateDevtools from '../../devtools/index.mock.js'
import defaultCreateHistory from '../../history/index.js'
import defaultCreateCookies from '../../cookies/index.js'

import findInClosestAncestor, { findClosestAncestorWith } from '../../utils/findInClosestAncestor.js'
import createBranchesAll from '../../replays/createBranchesAll.js'

import { isTest, isProd, kinds} from '../../utils.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import sliceBranch, { sliceEventByBranch, traverseModuleChildren } from '../../utils/sliceBranch.js'
import { getSessionState, saveSessionState } from '../../utils/sessionState.js'
import findOne from '../../selectors/findOne.js'
import { is, thisIn } from '../../utils/inIs.js'


export default (top, session) => {
  const { replayState, seed, basenames = {} } = session
  const branch = replayState.branch

  const branchesAll = createBranchesAll(top, branch)
  const branches = { get undefined() { return this[''] } }
  const listeners = []
  const promises = []

  const ctx = window.state?.respond?.ctx ?? {}

  const {
    createDevtools = defaultCreateDevtools,
    createHistory = defaultCreateHistory,
    createCookies = defaultCreateCookies,
    ...options
  } = top.options ?? {}

  const getStore = () => branches['']

  return {
    top,
    ctx,
    prev: window.state?.respond,

    replayState,
    seed,
    basenames,

    devtools: createDevtools(),
    history: createHistory(),
    cookies: createCookies(),

    focusedModule: sliceBranch(top, branch),
    focusedBranch: branch,

    branchesAll,
    
    branches,
    branchLocatorsById: {},

    modelsByBranch: {},
    modelsByBranchType: {},

    eventsByPattern: {},
    eventsByType: {},

    listeners,
    promises,
    refs: {},
    eventsCache: new Map,

    kinds,
  
    dispatch,
    trigger(ev, meta) {
      return this.respond.dispatch(ev, { ...meta, trigger: true })
    },

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
  
    findOne,

    is,
    in: thisIn,

    replaceWithProxies: function replaceWithProxies(proxy, b = '') {
      proxy.respond.state = Object.getPrototypeOf(proxy).state = branches[b] = proxy // replace module states with proxy
      proxy.moduleKeys.forEach(k => replaceWithProxies(proxy[k], b ? `${b}.${k}` : k))
    },
    
    saveSessionState() {
      const snap = this.snapshot(getStore())
      return saveSessionState(snap)
    },

    getSessionState() {
      return getSessionState(getStore().respond)
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
      return this.respond.fromEvent(a).url === this.respond.fromEvent(b).url
    },

    changeBasename(basename) {
      const e = this.respond.eventFrom(window.location.href)
      const { state, branch } = this.respond

      const prevBasename = state.basename
      const prevBasenameFull = state.basenameFull
      
      state.basename = basenames[branch] = basename
      state.basenameFull = prevBasenameFull.replace(new RegExp(prevBasename + '$'), basename)

      traverseModuleChildren(state, (state, parent) => {
        state.basenameFull = parent.basenameFull + state.basename
      })

      const { eventsByPattern } = this.respond
      const next = {}

      Object.keys(eventsByPattern).forEach(prev => {
        const event = eventsByPattern[prev]
        const pattern = event.module.basenameFull + event.pattern
        next[pattern] = event
        delete eventsByPattern[prev]
      })

      Object.assign(eventsByPattern, next)

      this.respond.history.changePath(e, true)
      this.respond.queueSaveSession()
    },
  
    findInClosestAncestor(key, b) {
      const b2 = branch ? (b ? branch + '.' + b : branch) : b
      return findInClosestAncestor(key, b2, top)
    },

    findClosestAncestorWith(key, b) {
      const b2 = branch ? (b ? branch + '.' + b : branch) : b
      return findClosestAncestorWith(key, b2, top)
    },
  
    subscribe(send) {
      send.module = this.respond.state
      send.branch = this.respond.state.branch // branch of module attached to `respond` object unique to each module
      
      const mp = send.branch
      
      const sendOuter = send.length < 2 || !mp
        ? send
        : (state, e) => send(state, sliceEventByBranch(e, mp))

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
      if (event === this.respond.state.events.init) return

      const sent = listeners
        .filter(send => e.branch.indexOf(send.branch) === 0) // event is child of subscribed module or the same module
        .map(send => send(send.module, e))

      if (sent.length > 0) promises.push(sent)
    },
  
    onError(err)  {
      const { error, kind = 'unknown', e } = err
    
      if (kind !== 'render') { // react render errors already logged
        console.error('respond: ' + kind, e || '')
        console.error(error)
      }

      const ownOnError = this.respond.state.options.onError
    
      const onError = ownOnError ?? getStore().state.options.onError
      const s = ownOnError ? this.respond.state : getStore()

      return onError?.({ ...err, state: s })
    }
  }
}
import dispatch, { trigger } from './methods/dispatch.js'
import App from './methods/App.js'
import reduce from './methods/reduce.js'
import listen from './methods/listen.js'
import revive from './methods/revive.js'
import onError from './methods/onError.js'
import proxify from './methods/proxify.js'
import fromEvent from './methods/fromEvent.js'
import eventFrom from './methods/eventFrom.js'
import { is, thisIn } from './methods/inIs.js'
import addToCache from './methods/addToCache.js'
import changeBasename from './methods/changeBasename.js'
import subscribe, { notify } from './methods/subscribe.js'
import simulateLatency from './methods/simulateLatency.js'
import queueSaveSession from './methods/queueSaveSession.js'
import promisesCompleted from './methods/promisesCompleted.js'
import awaitInReplaysOnly from './methods/awaitInReplaysOnly.js'
import isEqualNavigations from './methods/isEqualNavigations.js'


import render from '../react/render.js'
import snapshot from '../proxy/snapshot.js'
import { commit } from '../proxy/helpers/queueNotification.js'

import defaultCreateHistory from '../history/index.js'
import defaultCreateCookies from '../helpers/cookies/index.js'

import createDb from './createDb.js'
import createDbCache from './createDbCache.js'
import createUrlCache from './createUrlCache.js'
import createBranches from './createBranches.js'

import kinds from './kinds.js'
import { isProd } from '../helpers/constants.js'
import assignProto from '../utils/assignProto.js'
import createAncestors from './helpers/createAncestors.js'
import { _branch, _module, _top } from './reserved.js'


export default (top, system, focusedModule, focusedBranch) => {
  const { replayState, prevUrl = null, basenames = {} } = system
  const prev = window.state?.respond

  const {
    createHistory = defaultCreateHistory,
    createCookies = defaultCreateCookies,
    ...options
  } = top.options ?? {}

  function Respond(props) {
    Object.assign(this, props)

    this.listeners = new Set
    this.overriden = new Map
    this.db = createDb(this, Respond)
    this.responds[this.branch] = this
    this.App = App.bind(this)
    this.reduce = reduce.bind(this)
    this.render = render.bind(this)
    this.snapshot = snapshot.bind(this)
    this.eventFrom = eventFrom.bind(this)
    this.ancestors = createAncestors(this.branch)
    this.isTop = this.mod.branchAbsolute === focusedBranch
    this.dbCache = createDbCache(this, this.cache.dbCache ??= {})
    this.urlCache = createUrlCache(this, this.cache.urlCache ??= {}, fromEvent)
    
    assignProto(props.state, { [_module]: true, [_top]: this.isTop, db: this.db, kinds, is, in: thisIn, refs: {} })
  }

  Respond.prototype = {
    top, // core data
    prev,
    kinds,
    system,
    prevUrl,
    basenames,
    replayState,
    focusedBranch,
    focusedModule,

    App, // methods
    reduce,
    render,
    commit,
    notify,
    listen,
    revive,
    proxify,
    dispatch,
    trigger,
    onError,
    snapshot,
    subscribe,
    fromEvent,
    eventFrom,
    addToCache,
    changeBasename,
    simulateLatency,
    queueSaveSession,
    promisesCompleted,
    awaitInReplaysOnly,
    isEqualNavigations,

    promises: [], // storage
    subscribers: [],

    ctx: {},
    responds: {},
    eventsByType: {},
    eventsByPattern: {},
    branchLocatorsById: {},
    modelsByBranchType: {},

    eventsCache: new Map,
    versionListeners: new WeakMap,
    refIds: isProd ? new WeakMap : new Map,

    hmr: replayState.hmr,
    reuseEvents:      prev?.focusedBranch === focusedBranch,
    prevEventsByType: prev?.focusedBranch === focusedBranch ? prev.eventsByType : {},
    mem: { ...prev?.mem, rendered: false },
    cache: system.cache ?? {},
    
    devtools: new Proxy({}, { get: () => () => {} }), // tools
    history: createHistory(),
    cookies: createCookies(),
    branchNames: createBranches(top, focusedBranch),   // important: create branch names, assign moduleKeys array to each module, etc,

    branches: { get undefined() { return this[''] } }, // important: modules by branch will be stored here when created in addModule.js

    get topState() {
      return this.branches['']                         // escape hatch: any module can access the top if it really needs
    },
    
  }

  return Respond
}
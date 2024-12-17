import dispatch, { trigger } from './methods/dispatch.js'
import listen from './methods/listen.js'
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
  const prev = window.state?.respond
  const { replayState, prevUrl, basenames = {} } = system

  const {
    createHistory = defaultCreateHistory,
    createCookies = defaultCreateCookies,
    ...options
  } = top.options ?? {}

  function Respond(props) {
    Object.assign(this, props)

    this.listeners = new Set
    this.overriden = new Map
    this.isTop = props.mod === top
    this.db = createDb(this, Respond)
    this.responds[this.branch] = this
    this.snapshot = snapshot.bind(this)
    this.eventFrom = eventFrom.bind(this)
    this.ancestors = createAncestors(this.branch)

    assignProto(props.state, { [_module]: true, [_top]: this.isTop, db: this.db, kinds, is, in: thisIn })
  }

  Respond.prototype = {
    top,
    prev,
    system,

    kinds,
    prevUrl,
    basenames,
    replayState,

    focusedBranch,
    focusedModule,

    render,
    commit,
    notify,
    listen,
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

    ctx: {},
    refs: {},
    responds: {},
    eventsByType: {},
    eventsByPattern: {},
    branchLocatorsById: {},
    modelsByBranchType: {},
    
    promises: [],
    subscribers: [],

    eventsCache: new Map,
    versionListeners: new WeakMap,
    refIds: isProd ? new WeakMap : new Map, // enable peaking inside map during development  

    hmr: replayState.status === 'hmr',
    reuseEvents:      prev?.focusedBranch === focusedBranch,

    prevEventsByType: prev?.focusedBranch === focusedBranch ? prev.eventsByType : {},
    branches: { get undefined() { return this[''] } },
    mem: { ...prev?.mem, rendered: false },
  
    devtools: new Proxy({}, { get: () => () => undefined }),
    history: createHistory(),
    cookies: createCookies(),
    dbCache: createDbCache(system.dbCache),
    urlCache: createUrlCache(system.urlCache, fromEvent),
    allBranchNames: createBranches(top, focusedBranch), // important: create branch names, assign moduleKeys array to each module, etc,

    get topState() {
      return this.branches['']
    }
  }

  return Respond
}
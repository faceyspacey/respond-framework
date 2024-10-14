import dispatch from './dispatch.js'
import dispatchSync from './dispatchSync.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import reduce from '../plugins/reduce.js'
import render from '../../react/render.js'

import { isTest, isProd, kinds} from '../../utils.js'
import { createStateReviver, replacer } from '../../utils/revive.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import { sliceEventByModulePath } from '../../utils/sliceByModulePath.js'


export default {
  modulePaths: {},
  modulePathsById: {},
  modelsByModulePath: {},

  eventsByPath: {},
  eventsByType: {},

  listeners: [],
  promises: [],
  refs: {},
  overridenReducers: new Map,

  dispatch,
  dispatchSync,

  fromEvent,
  eventFrom,

  addToCache,
  addToCacheDeep,

  snapshot,
  reduce,
  render,

  kinds,
  replacer,

  stringifyState(st) {
    return JSON.stringify(snapshot(st || this), this.replacer)
  },
  parseJsonState(json) {
    return JSON.parse(json, createStateReviver(this))
  },

  shouldAwait() {
    return this.ctx.isFastReplay || isTest
  },
  awaitInReplaysOnly(f) {
    return this.shouldAwait() ? f() : this.promises.push(f()) // f is async
  },

  isEqualNavigations(a, b) {
    return a && b && this.fromEvent(a).url === this.fromEvent(b).url
  },

  findInClosestParent(key, slice = this.top, modulePath = this.getStore().modulePath) {
    const parentModules = []
  
    if (modulePath) {
      modulePath.split('.').forEach(k => {
        parentModules.unshift(slice)
        slice = slice[k]
      })
    }
  
    return parentModules.find(p => p[key])?.[key]
  },

  getStatus(rawSettings, settings) {
    const prevStore = window.store
    
    const replay = !!rawSettings && !isProd
    const hmr = !!prevStore && !replay

    const modulePath = settings?.module || ''

    return { prevStore, replay, hmr, modulePath }
  },

  subscribe(send) {
    send.modulePath = this.modulePath
    this.listeners.push(send)
  
    return () => {
      const index = this.listeners.findIndex(l => l === send)
      this.listeners.splice(index, 1)
    }
  },
  
  notify(e) {
    const state = this.getStore()
  
    const sent = state.listeners.map(send => {
      const isSelfOrAncestor = e.modulePath.indexOf(send.modulePath) === 0
      if (!isSelfOrAncestor) return
      
      const storeSlice = this.modulePaths[send.modulePath]
      const eSlice = sliceEventByModulePath(e, send.modulePath)
  
      return send(storeSlice, eSlice)
    })
  
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
  
    return this.options?.onError?.({ ...err, store: this })
  }
}
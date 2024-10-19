import dispatch from './dispatch.js'
import dispatchSync from './dispatchSync.js'

import fromEvent from './fromEvent.js'
import eventFrom from './eventFrom.js'

import snapshot from '../../proxy/snapshot.js'
import render from '../../react/render.js'

import { isTest, isProd, kinds} from '../../utils.js'
import { createStateReviver, replacer } from '../../utils/revive.js'
import { addToCache, addToCacheDeep } from '../../utils/addToCache.js'
import { sliceEventByModulePath } from '../../utils/sliceByModulePath.js'


export default (state, replayModulePath, respond) => {
  const modulePaths = { ['']: state, undefined: state }
  const listeners = []
  const promises = []
  const ctx = { ...window.store?.ctx, init: true }

  return {
    ...respond,
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
  
    kinds, //?
  
    dispatch, //
    dispatchSync, //
  
    fromEvent, //
    eventFrom, //
  
    addToCache, //
    addToCacheDeep, //
  
    snapshot, //
    render, //
  
    getStore() {
      return state
    },
  
    stringifyState(st) {
      return JSON.stringify(snapshot(st || state), this.options.replacer ?? replacer)
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
    },
  
    isEqualNavigations(a, b) {
      return a && b && this.respond.fromEvent(a).url === this.respond.fromEvent(b).url
    },
  
    findInClosestAncestor(key, modulePath, top = respond.top) {
      modulePath = replayModulePath
        ? modulePath ? replayModulePath + '.' + modulePath : replayModulePath
        : modulePath

      if (!modulePath) return top[key]  // top.db

      let mod = top
  
      return modulePath                 // 'admin.foo.bar'
        .split('.')                     // ['admin', 'foo', 'bar]
        .slice(0, -1)                   // ['admin', 'foo']   
        .map(k => mod = mod[k])         // [admin, foo]
        .reverse()                      // [foo, admin]
        .find(p => p[key])              // admin.db
        ?.[key] ?? top[key]             // admin.db ?? top.db
    },

    findInClosestAncestorOld(key, modulePath, top = state.top) {
      const path = replayModulePath
        ? modulePath ? replayModulePath + '.' + modulePath : replayModulePath // a nested module may be set in the replaytools, and the purpose of this function is to be able to scan back through unused ancestor modules for inherited pillars like `db`
        : modulePath

      if (!path) return top[key]

      const parentModules = []
      let mod = top
      
      if (path) {
        path.split('.').forEach(k => {
          parentModules.unshift(mod)
          mod = mod[k] ?? {}
        })
      }
    
      return parentModules.find(p => p[key])?.[key]
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
      const sent = listeners.map(send => {
        const mp = send.modulePath // ancestor which has subscribed
        const eventIsChildOfSubscribingModuleOrTheSameModule = e.modulePath.indexOf(mp) === 0
  
        if (!eventIsChildOfSubscribingModuleOrTheSameModule) return
        
        return send(
          modulePaths[mp],
          sliceEventByModulePath(e, mp)
        )
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
    
      const onError = this.respond.state.options.onError ?? state.options.onError

      return onError?.({ ...err, store: state })
    }
  }
}


export function getStatus(rawSettings, settings) {
  const prevStore = window.store
  
  const replay = !!rawSettings && !isProd
  const hmr = !!prevStore && !replay

  const modulePath = settings?.module || ''

  return { prevStore, replay, hmr, modulePath }
}




export function findInClosestAncestor(key, modulePath, top = state.top) {
  if (!modulePath) return top[key]  // top.db

  let mod = top

  return modulePath                 // 'admin.foo'
    .split('.')                     // ['admin', 'foo']
    .slice(0, -1)
    .map(k => mod = mod[k])         // [admin, foo]
    .reverse()                      // [foo, admin]
    .find(p => p[key])              // admin.db
    ?.[key] ?? top[key]             // admin.db ?? top.db
}



// const createFindInClosestParent = replayModulePath => {
//   const parentModules = []
//   let slice = state

//   if (replayModulePath) {
//     replayModulePath.split('.').forEach(k => {
//       parentModules.unshift(slice)
//       slice = slice[k]
//     })
//   }

//   return key => parentModules.find(p => p[key])?.[key]
// }


const createFindInClosestParent = (top, modulePath) => {
  const parentModules = []
  let slice = top

  if (modulePath) {
    modulePath.split('.').forEach(k => {
      parentModules.unshift(slice)
      slice = slice[k]
    })
  }

  return parentModules.find(p => p[key])?.[key]
}
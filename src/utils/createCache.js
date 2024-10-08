import sliceByModulePath from './sliceByModulePath.js'


export default (getStore, options = {}) => {
  const {
    getCacheState = store => store.state.cachedPaths,
    createKey = (e, store) => store.fromEvent(e).url,
    has = (e, store) => {
      const { cache } = e.event

      if (cache !== undefined) {
        return isCached(store, e, cache)
      }

      return !!(e.cached || !e.event.fetch || store.cache.get(e))
    }
  } = options


  return {
    get(eOrLoc) {
      const store = getStore()
      const e = eOrLoc.event?.__event ? eOrLoc : store.eventFrom(eOrLoc)
      const k = createKey(e, store)
      return getCacheState(store)[k] ? k : null
    },

    set(eOrLoc) {
      const store = getStore()
      const e = eOrLoc.event?.__event ? eOrLoc : store.eventFrom(eOrLoc)
      const k = createKey(e, store)
      getCacheState(store)[k] = true
    },
  
    unset(eOrLoc) {
      const store = getStore()
      const e = eOrLoc.event?.__event ? eOrLoc : store.eventFrom(eOrLoc)
      const k = createKey(e, store)
      delete getCacheState(store)[k]
    },
    
    clear() {
      const store = getStore()
      const keys = getCacheState(store)

      for (const k in keys) {
        delete keys[k]
      }
    },

    has(eOrLoc) {
      const store = getStore()
      const e = eOrLoc.event?.__event ? eOrLoc : store.eventFrom(eOrLoc)
      return has(e, store)
    },
  }
}




function isCached (store, e, cache) {
  if (typeof cache === 'function') {
    const storeSlice = sliceByModulePath(store, e.modulePath)
    const cached = store.cache.get(e)

    return cache.call(e.event, storeSlice, e, cached)
  }

  return !!cache
}
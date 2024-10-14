export default (state, options = {}) => {
  const {
    getCacheState = state => state.cachedPaths,
    createKey = (e, state) => state.fromEvent(e).url,
    has = (e, state) => {
      const { cache } = e.event

      if (cache !== undefined) {
        return isCached(state, e, cache)
      }

      return !!(e.cached || !e.event.fetch || state.cache.get(e))
    }
  } = options


  return {
    get(eOrLoc) {
      const e = eOrLoc.event?.__event ? eOrLoc : state.eventFrom(eOrLoc)
      const k = createKey(e, state)
      return getCacheState(state)[k] ? k : null
    },

    set(eOrLoc) {
      const e = eOrLoc.event?.__event ? eOrLoc : state.eventFrom(eOrLoc)
      const k = createKey(e, state)
      getCacheState(state)[k] = true
    },
  
    unset(eOrLoc) {
      const e = eOrLoc.event?.__event ? eOrLoc : state.eventFrom(eOrLoc)
      const k = createKey(e, state)
      delete getCacheState(state)[k]
    },
    
    clear() {
      const keys = getCacheState(state)

      for (const k in keys) {
        delete keys[k]
      }
    },

    has(eOrLoc) {
      const e = eOrLoc.event?.__event ? eOrLoc : state.eventFrom(eOrLoc)
      return has(e, state)
    },
  }
}




function isCached (state, e, cache) {
  if (typeof cache === 'function') {
    const storeSlice = state.modulePaths[e.modulePath]
    const cached = state.cache.get(e)

    return cache.call(e.event, storeSlice, e, cached)
  }

  return !!cache
}
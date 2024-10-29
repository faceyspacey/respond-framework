export default (state, k = 'navigationCache') => {
  state[k] ??= {}
  const cache = state[k] // reactive proxy

  const { respond } = state
  const { modulePaths } = respond

  return {
    urls: cache,
    get(e) {
      const k = respond.fromEvent(e).url
      return cache[k] ? k : null
    },
  
    set(e) {
      const k = respond.fromEvent(e).url
      cache[k] = true
    },
  
    delete(e) {
      const k = respond.fromEvent(e).url
      delete cache[k]
    },
  
    clear() {
      for (const k in cache) delete cache[k]
    },
  
    has(e) {
      const { event } = e
      const { cache } = event
      if (typeof cache === 'function') return event.cache(modulePaths[e.modulePath], e, this.get(e))
      if (cache !== undefined) return !!cache
      return !!(e.meta.cached || !event.fetch || this.get(e))
    },
  }
}
export default (state, k = 'navigationCache') => {
  state[k] ??= {}
  const cache = state[k] // reactive proxy

  const { respond } = state

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
      if (!event.path) return false
      if (typeof event.cache === 'function') return event.cache(event.module, e, this.get(e))
      if (event.cache !== undefined) return !!event.cache
      return !!(!event.fetch || e.meta.cached || this.get(e))
    },
  }
}
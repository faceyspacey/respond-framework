export default (cache = {}, fromEvent) => ({
  cache,
  
  toJSON() {
    return this.cache
  },

  get(e) {
    const k = fromEvent(e).url
    return cache[k] ? k : null
  },

  set(e) {
    const k = fromEvent(e).url
    cache[k] = true
  },

  delete(e) {
    const k = fromEvent(e).url
    delete cache[k]
  },

  clear() {
    for (const k in cache) delete cache[k]
  },

  has(e) {
    const { event } = e
    if (!event.pattern) return false
    if (typeof event.cache === 'function') return !!event.cache.call(event.module, event.module, e, this.get(e))
    if (event.cache !== undefined) return !!event.cache
    return !!(!event.fetch || e.meta.cached || this.get(e))
  }
})
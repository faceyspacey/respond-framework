export default (respond, cache, fromEvent) => ({
  get(e) {
    const k = fromEvent(e).url
    const branch = e.event.respond.branch
    return cache[branch]?.[k] ? k : null
  },

  set(e) {
    const k = fromEvent(e).url
    const branch = e.event.respond.branch
    cache[branch] ??= {}
    cache[branch][k] = true
  },

  delete(e) {
    const k = fromEvent(e).url
    const branch = e.event.respond.branch
    cache[branch] ??= {}
    delete cache[branch][k]
  },

  clear() {
    const { branch } = respond
    cache[branch] ??= {}
    const c = cache[branch] ?? {}
    for (const k in c) delete c[k]
  },

  has(e) {
    const { event } = e
    if (!event.pattern) return false
    if (e.meta.cached === false) return false // manual setting in a plugin
    if (event.cache !== undefined && typeof event.cache !== 'function') return !!event.cache

    const cached = !!(!event.fetch || e.meta.cached || this.get(e))

    if (typeof event.cache === 'function') return !!event.cache.call(event.module, event.module, e, cached)
      
    return cached
  }
})
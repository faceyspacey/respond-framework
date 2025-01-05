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
    if (typeof event.cache === 'function') return !!event.cache.call(event.module, event.module, e, this.get(e))
    if (event.cache !== undefined) return !!event.cache
    return !!(!event.fetch || e.meta.cached || this.get(e))
  }
})
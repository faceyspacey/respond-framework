export default state => ({
  get(e) {
    const k = state.respond.fromEvent(e).url
    return state.cachedPaths[k] ? k : null
  },

  set(e) {
    const k = state.respond.fromEvent(e).url
    state.cachedPaths[k] = true
  },

  delete(e) {
    const k = state.respond.fromEvent(e).url
    delete state.cachedPaths[k]
  },

  clear() {
    const keys = state.respond.cachedPaths
    for (const k in keys) delete keys[k]
  },

  has(e) {
    const { cache } = e.event
    if (typeof cache === 'function') return e.event.cache(state.respond.modulePaths[e.modulePath], e, this.get(e))
    if (cache !== undefined) return !!cache
    return !!(e.meta.cached || !e.event.fetch || this.get(e))
  },

  async prefetch(event, arg, meta) {
    if (!e.event.fetch) return
    const e = event(arg, meta)
    await event.fetch(state, e)
  }
})
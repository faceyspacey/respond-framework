export default (urls = {}, respond) => ({
  urls,
  get(e) {
    const k = respond.fromEvent(e).url
    return urls[k] ? k : null
  },

  set(e) {
    const k = respond.fromEvent(e).url
    urls[k] = true
  },

  delete(e) {
    const k = respond.fromEvent(e).url
    delete urls[k]
  },

  clear() {
    for (const k in urls) delete urls[k]
  },

  has(e) {
    const { event } = e
    if (!event.pattern) return false
    if (typeof event.cache === 'function') return !!event.cache.call(event.module, event.module, e, this.get(e))
    if (event.cache !== undefined) return !!event.cache
    return !!(!event.fetch || e.meta.cached || this.get(e))
  }
})
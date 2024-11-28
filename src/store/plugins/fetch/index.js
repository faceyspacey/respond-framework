import createCache from './createCache.js'


export default ({ cache = true } = {}) => cache ? fetchWithNavigationCache : fetchWithConsistentFollowup


const fetchWithNavigationCache = {
  enter(state, e) {
    if (e.meta.cached || !e.event.fetch) return
    if (e.event.pattern) state.respond.cache.set(e)
    return fetch(state, e)
  },

  load(state) {
    state.respond.cache = createCache(state) 
    Object.getPrototypeOf(state).cache = state.respond.cache
  }
} 


const fetchWithConsistentFollowup = {
  enter(state, e) {
    if (e.event.fetch) return fetch(state, e)
    if (e.event.pattern) return e.event.done.dispatch(undefined, { from: e }) // always dispatch a *consistent* follow-up, as app architecture desires always receiving a follow-up, while relying on apiCache instead -- can be used to display loading spinners on buttons *before* navigating; to do so switch on the .done event of navigations in a Page/Screen reducer
  }
}


const fetch = async (state, e) => {
  const res = await e.event.fetch.call(state, state, e)

  state.respond.devtools.sendPluginNotification({ type: 'fetch', returned: res }, e)

  if (res?.error) {
    await e.event.error.dispatch(res, { from: e })
    if (e.event.pattern) state.respond.cache?.delete(e)
    return false
  }

  await e.event.done.dispatch(res, { from: e })
}
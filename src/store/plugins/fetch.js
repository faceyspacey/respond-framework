import createCache from '../../utils/createCache.js'


export default {
  async enter(state, e) {
    if (!e.event.fetch || e.meta.cached) return
    await fetch(state, e)
  },

  load(state) {
    const cache = createCache(state)
    state.respond.cache = cache
    state.cache = cache
  }
} 


async function fetch(store, e) {
  if (e.event.path) store.cache.set(e)
  
  const res = await e.event.fetch(store, e)
  store.devtools.sendPluginNotification({ type: 'fetch', returned: res }, e)

  if (res?.error) {
    await e.event.error.dispatch(res, { from: e })
    if (e.event.path) store.cache.delete(e)
    return false
  }

  await e.event.done.dispatch(res, { from: e })
}




export async function fetchPluginWithCachedFollowUp(store, e) {
  if (e.event.fetch) {
    if (e.meta.cached) await e.event.cached.dispatch(undefined, { from: e })
    else await fetch(store, e)
  }
  else if (e.event.path) {
    await e.event.cached.dispatch(undefined, { from: e })
  }
}
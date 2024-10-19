export default async function fetchPlugin(store, e) {
  if (!e.event.fetch || e.cached) return
  await fetch(store, e)
}


async function fetch(store, e) {
  if (e.event.path) store.cache.set(e)
  
  const res = await e.event.fetch.call(e.event, store, e)
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
    if (e.cached) await e.event.cached.dispatch(undefined, { from: e })
    else await fetch(store, e)
  }
  else if (e.event.path) {
    await e.event.cached.dispatch(undefined, { from: e })
  }
}
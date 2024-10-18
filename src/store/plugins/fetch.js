export default async (store, e) => {
  if (e.event.fetch) {
    if (e.cached === true) {
      if (store.options.alwaysDispatchFollowUp) {
        await e.event.cached.dispatch(undefined, { from: e })
      }
    }
    else {
      if (e.event.path) {
        store.cache.set(e)
      }
      
      const res = await e.event.fetch.call(e.event, store, e)

      store.devtools.sendPluginNotification({ type: 'fetch', returned: res }, e)

      if (res?.error) {
        await e.event.error.dispatch(res, { from: e })
        
        if (e.event.path) {
          store.cache.delete(e)
        }

        return false
      }
      else await e.event.done.dispatch(res, { from: e })
    }
  }
  else if (e.event.path) {
    if (store.options.alwaysDispatchFollowUp) {
      await e.event.cached.dispatch(undefined, { from: e })
    }
  }
}
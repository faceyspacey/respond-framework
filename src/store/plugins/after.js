export default async (store, e) => {
  if (!e.event.after) return

  // don't await, as the intention of this plugin is to not delay subsequent events that might be run sequentially
  // otherwise use the end plugin as is more common

  await store.awaitInReplaysOnly(async () => {
    try {
      const res = await e.event.after.call(e.event, store, e)
  
      store.devtools.sendPluginNotification({ type: 'after', returned: res }, e)
  
      if (res?.error && !res.type) {
        await e.event.error.dispatch(res, { from: e })
      }
      else if (res?.type) {
        await store.dispatch(res, { from: e })
      }
      else if (res) {
        await e.event.data.dispatch(res, { from: e })
      }
    }
    catch(error) {
      store.onError(error, 'after', e)
    }
  })
}

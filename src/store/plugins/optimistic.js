export default async (store, e) => {
  if (!e.event.optimistic) return

  const res = await e.event.optimistic.call(e.event, store, e) // async supported, but optimistic is generally syncronous or at least fast

  store.devtools.sendPluginNotification({ type: 'optimistic', returned: res }, e)

  if (res) {
    // don't await because the goal is to quickly finish so we can move to next plugins (ie this is parallel)
    await store.awaitInReplaysOnly(async () => {
      if (res.type) {
        await store.dispatch(res, { from: e })
      }
      else {
        await e.event.data.dispatch(res, { from: e })
      }
    })
  }
}

export default async (store, e) => {
  if (!e.event.tap) return

  await store.awaitInReplaysOnly(async () => {
    try {
      store.devtools.sendPluginNotification({ type: 'tap' }, e)
      await e.event.tap.call(e.event, store, e)
    }
    catch (error) {
      store.onError(error, 'tap', e)
    }
  })
}

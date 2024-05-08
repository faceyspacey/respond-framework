export default async (store, e) => {
  if (!e.event.redirect) return

  const res = await e.event.redirect.call(e.event, store, e)

  store.devtools.sendPluginNotification({ type: 'redirect', returned: res }, e)

  if (res?.type) {
    await store.dispatch(res, { from: e })
  }
  else {
    return res
  }
}
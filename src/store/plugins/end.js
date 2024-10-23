export default async (store, e) => {
  if (!e.event.end) return

  const res = await e.event.end(store, e)

  store.devtools.sendPluginNotification({ type: 'end', returned: res }, e)

  if (res?.error && !res.type) {
    await e.event.error.dispatch(res, { from: e })
  }
  else if (res?.type) {
    await store.dispatch(res, { from: e })
  }
  else if (res) {
    await e.event.data.dispatch(res, { from: e })
    return res
  }
}
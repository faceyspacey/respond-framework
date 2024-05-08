export default async (store, e) => {
  if (!e.event.before) return

  const res = await e.event.before.call(e.event, store, e)

  if (res === false) {
    store.devtools.sendPrevented({ type: 'before', returned: res }, e)
    return false
  }

  if (res?.type) {
    store.devtools.sendRedirect({ type: 'before', returned: res }, e)
    await store.dispatch(res, { from: e }) // redirect
    return false
  }

  store.devtools.sendPluginNotification({ type: 'before', returned: res }, e)

  return res
}
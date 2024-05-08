export default async (store, e,) => {
  if (!e.event.validate) return

  const res = await e.event.validate.call(e.event, store, e)

  if (res === false) {
    store.devtools.sendPrevented({ type: 'validate', returned: res }, e)
    return false
  }

  if (res?.error || res?.flash?.error) {
    store.devtools.sendPrevented({ type: 'validate', returned: res }, e)
    await e.event.error.dispatch(res, { from: e })
    return false
  }

  store.devtools.sendPluginNotification({ type: 'validate', returned: res }, e)

  return res
}
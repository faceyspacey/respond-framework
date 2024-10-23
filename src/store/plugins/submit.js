export default async (store, e) => {
  if (!e.event.submit) return

  const res = await e.event.submit(store, e)

  store.devtools.sendPluginNotification({ type: 'submit', returned: res }, e)

  if (res === false) {
    return false // manual short-circuit
  }
  else if (res?.error && !res.event) {
    await e.event.error.dispatch(res, { from: e })
    return false
  }
  else if (res?.event) {
    await res.event.dispatch(res.arg, { from: e })
  }
  else {
    await e.event.done.dispatch(res, { from: e })
    return res
  }
}
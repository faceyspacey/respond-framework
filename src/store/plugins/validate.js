export default async (state, e) => {
  if (!e.event.validate) return

  const res = await e.event.validate.call(state, state, e)

  if (res === false) {
    state.devtools.sendPrevented({ type: 'validate', returned: res }, e)
    return false
  }

  if (res?.error || res?.flash?.error) {
    state.devtools.sendPrevented({ type: 'validate', returned: res }, e)
    await e.event.error.dispatch(res, { from: e })
    return false
  }

  state.devtools.sendPluginNotification({ type: 'validate', returned: res }, e)

  return res
}
export default async (state, e) => {
  if (!e.event.before) return

  const res = await e.event.before.call(state, state, e)

  if (res === false) {
    state.devtools.sendPrevented({ type: 'before', returned: res }, e)
    return false
  }

  if (res?.type) {
    state.devtools.sendRedirect({ type: 'before', returned: res }, e)
    await state.dispatch(res, { from: e, trigger: false }) // redirect
    return false
  }

  state.devtools.sendPluginNotification({ type: 'before', returned: res }, e)

  return res
}
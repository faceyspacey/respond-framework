export default async (state, e) => {
  if (!e.event.redirect) return

  const res = await e.event.redirect.call(state, state, e)

  state.devtools.sendPluginNotification({ type: 'redirect', returned: res }, e)

  if (res?.type) {
    await state.dispatch(res, { from: e })
  }
  else {
    return res
  }
}
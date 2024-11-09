export default async (state, e) => {
  if (!e.event.end) return

  const res = await e.event.end.call(state, state, e)

  state.devtools.sendPluginNotification({ type: 'end', returned: res }, e)

  if (res?.error && !res.type) {
    await e.event.error.dispatch(res, { from: e })
  }
  else if (res?.type) {
    await state.dispatch(res, { from: e })
  }
  else if (res) {
    await e.event.data.dispatch(res, { from: e })
    return res
  }
}
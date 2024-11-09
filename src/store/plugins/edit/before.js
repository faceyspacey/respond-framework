export default (state, e) => {
  if (!e.event.before) return

  const res = e.event.before.call(state, state, e)
  
  if (res === false) {
    state.devtools.sendPrevented({ type: 'before', returned: res }, e)
  }
  else {
    state.devtools.sendPluginNotification({ type: 'before', returned: res }, e)
  }

  return res
}
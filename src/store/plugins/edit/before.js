export default (state, e) => {
  if (!e.event.before) return

  const res = e.event.before.call(state, state, e)
  
  if (res === false) {
    state.respond.devtools.sendPrevented({ type: 'before', returned: res }, e)
  }
  else {
    state.respond.devtools.sendPluginNotification({ type: 'before', returned: res }, e)
  }

  return res
}
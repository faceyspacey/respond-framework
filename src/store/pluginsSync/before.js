export default (store, e) => {
  if (!e.event.before) return

  const res = e.event.before.call(e.event, store, e)
  
  if (res === false) {
    store.devtools.sendPrevented({ type: 'before', returned: res }, e)
  }
  else {
    store.devtools.sendPluginNotification({ type: 'before', returned: res }, e)
  }

  return res
}
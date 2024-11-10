import trySync from '../../utils/trySync.js'


export default (state, e) => {
  if (!e.event.redirect) return

  const res = e.event.redirect.call(state, state, e)
  state.devtools.sendPluginNotification({ type: 'redirect', returned: res }, e)
  return trySync(res, r => redirect(e, r))
}


const redirect = (from, res) =>
  res?.dispatch?.({ meta: { from } }) ?? res
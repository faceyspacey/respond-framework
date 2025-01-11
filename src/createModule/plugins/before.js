import trySync from '../../utils/trySync.js'


export default (state, e) => {
  if (!e.event.before) return

  const res = e.event.before.call(state, state, e)
  return trySync(res, r => before(state, e, r))
}



const before = (state, e, res) => {
  if (res === false) {
    state.respond.devtools.sendPrevented({ type: 'before', returned: res }, e)
    return false
  }

  if (res?.error || res?.flash?.error) {
    state.respond.devtools.sendPrevented({ type: 'before', returned: res }, e)
    return e.event.error.dispatch(res, { from: e }).then(_ => false)
  }

  if (res?.dispatch) {
    state.respond.devtools.sendRedirect({ type: 'before', returned: res }, e)
    return res.dispatch({ meta: { from: e } }).then(_ => false) // redirect
  }

  state.respond.devtools.sendPluginNotification({ type: 'before', returned: res }, e)

  return res
}
import trySync from '../../utils/trySync.js'


export default (state, e) => {
  if (!e.event.validate) return

  const res = e.event.validate.call(state, state, e)
  return trySync(res, r => validate(state, e, r))
}



const validate = (state, e, res) => {
  if (res === false) {
    state.respond.devtools.sendPrevented({ type: 'validate', returned: res }, e)
    return false
  }

  if (res?.error) {
    state.respond.devtools.sendPrevented({ type: 'validate', returned: res }, e)
    return e.event.error.dispatch(res, { from: e }).then(_ => false)
  }

  if (res?.dispatch) {
    state.respond.devtools.sendRedirect({ type: 'validate', returned: res }, e)
    return res.dispatch({ meta: { from: e } }).then(_ => false) // redirect
  }

  state.respond.devtools.sendPluginNotification({ type: 'validate', returned: res }, e)

  return res
}
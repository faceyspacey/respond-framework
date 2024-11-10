import trySync from '../../utils/trySync.js'


export default (state, e) => {
  if (!e.event.submit) return

  const res = e.event.submit.call(state, state, e)
  return trySync(res, r => submit(state, e, r))
}


const submit = (state, e, res) => {
  state.devtools.sendPluginNotification({ type: 'submit', returned: res }, e)

  const meta = { from: e }

  if (res === false) {
    return false // manual short-circuit
  }
  else if (res?.error && !res.dispatch) {
    return e.event.error.dispatch(res, meta).then(_ => false)
  }
  else if (res?.dispatch) {
    return res.dispatch({ meta })
  }
  else {
    return e.event.done.dispatch(res, meta).then(_ => res)
  }
}
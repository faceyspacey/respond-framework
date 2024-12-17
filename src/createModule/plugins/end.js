import trySync from '../../utils/trySync.js'


export default (state, e) => {
  if (!e.event.end) return

  const res = e.event.end.call(state, state, e)
  return trySync(res, r => end(state, e, r))
}


const end = (state, e, res) => {
  state.respond.devtools.sendPluginNotification({ type: 'end', returned: res }, e)

  const meta = { from: e }

  if (res?.error && !res.dispatch) {
    return e.event.error.dispatch(res, meta).then(_ => false)
  }
  else if (res?.dispatch) {
    return res.dispatch({ meta })
  }
  else if (res) {
    return e.event.data.dispatch(res, meta).then(_ => res)
  }
}
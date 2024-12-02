import trySync from '../../utils/trySync.js'


export default (state, e) => {
  if (!e.event.after) return

  const onError = error => state.respond.onError({ error, kind: 'after', e })

  return state.respond.awaitInReplaysOnly(() => { // <-- see here "await in replays only"
    const res = e.event.after.call(state, state, e)
    return trySync(res, r => after(state, e, r))
  }, onError)
}


// condtionally await only in replays, as the intention of this plugin is to not delay subsequent events dispatched immediately after
// eg:

// await events.first.dispatch()
// await events.next.dispatch()

// `next` will be dispatched while `first.after` is still running
// (except replays which rely on the previous trigger cycle completing)

const after = (state, e, res) => {
  state.respond.devtools.sendPluginNotification({ type: 'after', returned: res }, e)

  const meta = { from: e }

  if (res?.error && !res.dispatch) {
    return e.event.error.dispatch(res, meta)
  }
  else if (res?.dispatch) {
    return res.dispatch({ meta })
  }
  else if (res) {
    return e.event.data.dispatch(res, meta)
  }
}


// NOTE: if not needed, use the end plugin which is more common

import trySync from '../../utils/trySync.js'


export default (state, e) => {
  if (!e.event.optimistic) return

  const onError = error => state.onError({ error, kind: 'optimistic', e })
  
  return state.awaitInReplaysOnly(() => {
    const res = e.event.optimistic.call(state, state, e)  // optimistic is for fast syncronous routines like providing another event, which will be dispatched in parallel below
    return trySync(res, r => optimistic(state, e, r))     // however awaiting event.optimistic is supported; the idea is at least the subsequent dispatch will run in parallel
  }, onError)
}


const optimistic = (state, e, res) => {
  state.devtools.sendPluginNotification({ type: 'optimistic', returned: res }, e)
  const meta = { from: e }
  return res?.dispatch?.({ meta }) ?? (res && e.event.data.dispatch(res, meta))
}
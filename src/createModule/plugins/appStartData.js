export default ({
  before,
  getData,
  after,
  modular = false,
  parallel = false,
}) => (state, e) => {
  const s = modular ? state : state.respond.topState

  if (s._initialDataFetched) return
  s._initialDataFetched = true

  const promise = appStartData(s, e, before, getData, after)
  if (!parallel) return promise
  
  const onError = error => state.respond.onError({ error, kind: 'appStartData', e })
  return s.respond.awaitInReplaysOnly(promise, onError)
}



const appStartData = async (s, e, before, getData, after) => {
  let ret = await before?.(s, e)
  if (ret === false) return

  const data = await getData(s, e)
  Object.assign(e, data)
  s.respond.devtools.sendPluginNotification({ type: 'appStartData', returned: data }, e)

  ret = await after?.(s, e)
  if (ret === false) return

  const meta = { from: e, appStartData: true }
  await e.event.data.dispatch(data, meta)
}
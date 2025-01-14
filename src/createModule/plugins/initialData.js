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

  const promise = initialData(s, e, before, getData, after)
  if (!parallel) return promise
  
  const onError = error => state.respond.onError({ error, kind: 'initialData', e })
  return s.respond.awaitInReplaysOnly(promise, onError)
}



const initialData = async (s, e, before, getData, after) => {
  let ret = await before?.(s, e)
  if (ret === false) return

  const data = await getData(s, e)
  Object.assign(e, data, { data })
  s.respond.devtools.sendPluginNotification({ type: 'initialData', returned: data }, e)

  ret = await after?.(s, e)
  if (ret === false) return

  const meta = { from: e, initialData: true }
  await s.events.init.data.dispatch(data, meta)
}
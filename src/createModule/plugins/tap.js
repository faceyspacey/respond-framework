export default (state, e) => {
  if (e.event.tap) return tap(state, e)
}

const tap = (state, e) => state.respond.awaitInReplaysOnly(() => {
  try {
    state.respond.devtools.sendPluginNotification({ type: 'tap' }, e)
    return e.event.tap.call(state, state, e)
  }
  catch (error) {
    state.respond.onError({ error, kind: 'tap', e })
  }
})
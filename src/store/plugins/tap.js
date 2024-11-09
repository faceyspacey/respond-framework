export default async (state, e) => {
  if (!e.event.tap) return

  await state.awaitInReplaysOnly(async () => {
    try {
      state.devtools.sendPluginNotification({ type: 'tap' }, e)
      await e.event.tap.call(state, state, e)
    }
    catch (error) {
      state.onError({ error, kind: 'tap', e })
    }
  })
}

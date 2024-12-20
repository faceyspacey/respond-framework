import { act } from 'react-test-renderer'
import revive from '../../createModule/helpers/revive.js'


export default (respond, renderer) => async (e, meta, revived) => {
  const event = respond.eventsByType[e.type]
  const arg = revived ? e.arg : (e.arg ? revive(respond)(e.arg) : undefined)

  await act(async () => {
    await event.trigger(arg, meta)
    await renderer.createOnce() // only render the first time in test, after reactivity will handle subsequent renders
    await jest.runAllTimersAsync()
  })
}
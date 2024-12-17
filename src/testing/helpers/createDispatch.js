import { act } from 'react-test-renderer'
import revive from '../../createModule/helpers/revive.js'


export default state => async (e, m, revived) => {
  const event = state.respond.eventsByType[e.type]
  const meta = { ...e.meta, ...m, trigger: true }
  const arg = revived ? e.arg : revive(state.respond)(e.arg)

  await act(async () => {
    await event.dispatch(arg, meta)
  })
}
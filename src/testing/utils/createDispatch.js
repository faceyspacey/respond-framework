import { act } from 'react-test-renderer'
import revive from '../../utils/revive.js'


export default store => async (e, m, revived) => {
  const event = store.eventsByType[e.type]
  const meta = { ...e.meta, ...m, trigger: true }
  const arg = revived ? e.arg : revive(store)(e.arg)

  await act(async () => {
    await event.dispatch(arg, meta)
  })
}
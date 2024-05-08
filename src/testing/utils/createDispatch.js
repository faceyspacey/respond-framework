import { act } from 'react-test-renderer'
import { reviveObject } from '../../utils/jsonReplacerReviver.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'


export default store => async (e, m, revived) => {
  const event = sliceByModulePath(store.events, e.type)
  const meta = { ...e.meta, ...m, trigger: true }
  const arg = revived ? e.arg : reviveObject(store.events, e.arg)

  await act(async () => {
    await event.dispatch(arg, meta)
  })
}
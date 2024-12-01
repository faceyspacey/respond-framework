import { navigation } from '../kinds.js'


export default createParallelEvent => (state, e) => {
  if (e.kind !== navigation) return
  if (e.meta.parallel) return // prevent cycles, as often parallel dispatches are bi-directional; preventing these cycles is the key and only feature of this plugin

  const parallelEvent = createParallelEvent(state, e)
  if (!parallelEvent || parallelEvent.event === state.curr.event) return

  state.respond.devtools.sendPluginNotification({ type: 'parallel', returned: parallelEvent })

  const meta = { parallel: true, from: e }
  return parallelEvent.dispatch({ meta })
}
import { act } from 'react-test-renderer'
import revive from '../../createModule/helpers/revive.js'
import matchSnapshots from './matchSnapshots.js'


export default (respond, renderer) => async (e, meta, conf = {}, revived) => {
  const event = respond.eventsByType[e.type]
  const arg = revived ? e.arg : (e.arg ? revive(respond)(e.arg) : undefined)

  const unsub = conf.snapTrigger
    ? respond.subscribe(() => snapIntermediate(respond, renderer, e, conf), false)
    : conf.snapIntermediateStates
      ? respond.subscribe((state, eReal) => snapIntermediate(respond, renderer, e, conf, eReal), true) // true for snapping all reductions/dispatches
      : undefined

  await act(async () => {
    await event.trigger(arg, meta)
    await renderer.createOnce() // only render the first time in test, after reactivity will handle subsequent renders

    respond.commit() // optimization: if we aren't snapping triggers to capture loading states, then we only need to commit updates to the component tree once after awaiting trigger and all possible nested events dispatched
    
    await jest.runAllTimersAsync()
    unsub?.()
  })
}



const snapIntermediate = (respond, renderer, e, conf, eReal) => {
  if (!renderer._renderer) return // no need to snap trigger before initial render

  if (eReal.meta.trigger) {
    e = { ...e, snipes: e.triggerSnipes }

    conf = {
      ...conf,
      snapState: false, // by default turn these thints for trigger snaps
      logState: false,
      testIDs: false,
      snipes: false,
      ...conf.snapTrigger, // can supply `true` or object with overrides
      suffix: 'trigger',
    }
  }
  else {
    conf = {
      ...conf,
      snapState: false, // by default turn these thints for trigger snaps
      logState: false,
      testIDs: false,
      snipes: false,
      ...conf.snapIntermediateStates, // can supply `true` or object with overrides
      suffix: 'intermediate',
    }
  }

  act(() => respond.commit())
  matchSnapshots(respond, renderer, e, conf)
}
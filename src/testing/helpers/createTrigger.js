import { act } from 'react-test-renderer'
import revive from '../../createModule/helpers/revive.js'
import matchSnapshots from './matchSnapshots.js'


export default (respond, renderer) => async (e, meta, conf = {}, revived) => {
  const event = respond.eventsByType[e.type]
  const arg = revived ? e.arg : (e.arg ? revive(respond)(e.arg) : undefined)

  const snapMore = (conf.snapTrigger || conf.snapAll) && snap.bind(null, respond, renderer, e, conf)
  const unsub = snapMore && respond.subscribe(snapMore, conf.snapAll) // subscribe(cb, true) for snapping all reductions/dispatches, subscribe(cb) for just trigger

  await act(async () => {
    await event.trigger(arg, meta)
    await renderer.createOnce() // only render the first time in test, after reactivity will handle subsequent renders

    respond.commit() // optimization: if we aren't snapping triggers to capture loading states, then we only need to commit updates to the component tree once after awaiting trigger and all possible nested events dispatched
    
    await jest.runAllTimersAsync()
    unsub?.()
  })
}



const snap = (respond, renderer, eTest, conf, state, e) => {
  if (!renderer._renderer) return // no need to snap trigger before initial render

  if (e.meta.trigger) {
    eTest = { ...eTest, snipes: eTest.triggerSnipes }

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
  matchSnapshots(respond, renderer, eTest, conf)
}
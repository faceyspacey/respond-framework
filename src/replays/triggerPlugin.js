import revive from '../utils/revive.js'
import combineInputEvents from '../devtools/utils/combineInputEvents.js'
import { isEqualDeepPartial } from '../utils/isEqual.js'
import { prependModulePathToE as fullPath } from '../utils/sliceByModulePath.js'
import { mergeModulesPrevState } from '../store/hydrateModules.js'
import { snapDeepClone } from '../proxy/snapshot.js'


export default function (state, e) {
  if (!e.meta.trigger) return

  const top = state.getStore()

  const { respond, replayTools } = top

  if (top.replayState.status === 'session') {
    top.replayState.status = 'ready'
    const refresh = window.state.prevUrl === respond.fromEvent(e).url
    if (refresh) return false // refresh, so nothing needs to happen (but if the URL was changed, we still want to honor it)
  }

  if (e.modulePath === 'replayTools' && !replayTools.config.log) {
    mergeModulesPrevState(replayTools, snapDeepClone(replayTools)) // mergeModulesPrevState(top.replayTools, tops.respond.snapshot(top.replayTools))
    return
  }

  if (!e.meta.skipped) {
    mergeModulesPrevState(top, snapDeepClone(top)) // mergeModulesPrevState(top, top.respond.snapshot(top))
  }

  if (!replayTools) return

  sendTrigger(fullPath(e), replayTools, top)

  if (e.meta.skipped) {
    // devtools.forceNotification({ ...fullPath(e), __prefix: '-- ' })
    return false
  }
}



const sendTrigger = (e, state, top) => {
  const index = ++state.evsIndex

  if (state.playing) {
    state.evs[index] = e // event from tests isn't fully created yet, so we need to manually add it to the events array
    return // during replays we preserve the events array, but move through it by index only, so you can see completed events in green, and yet to be dispatched rows in white (or purple)
  }
  
  const events = state.evs

  const prev = events[index - 1]
  const dispatchedSameAsSkippedEvent = prev?.meta?.skipped && isEqual(prev, e, top)

  if (dispatchedSameAsSkippedEvent) {
    delete prev.meta.skipped // ux optimization: user desired to unskip it by manually performing the same event
    return
  }

  const lastEntryIndex = events.length - 1
  const shouldClipTail = index <= lastEntryIndex

  if (shouldClipTail) {
    const dispatchedSameEvent = clipTail(e, state, events, index, top)
    if (dispatchedSameEvent) return // ux optimization: do nothing, as index increment resolves this automatically
  }

  if (inputConverged(e, state, events)) return // ux optimization: undo divergence + combine into single input event if user manually enters same input value after multiple keystrokes!
    
  events.push(e)
}



// helpers

const clipTail = (e, state, events, index, top) => {
  const next = events[index]
  if (isEqual(next, e, top)) return true // user manually performed next event in sequence, so act as if there was no divergence

  events.splice(index)
  state.divergentIndex = index
}



const isEqual = (a, b, top) => {
  if (a.type !== b.type) return false
  const arg = revive(top)(a.arg || {})   // revive possible event function references in test arg
  return isEqualDeepPartial(arg, b.arg)           // e.arg may have some unrelated nested functions -- matching everything in arg works well for this case
}



const inputConverged = (e, state, events) => {
  const { tests, selectedTestId, divergentIndex } = state

  const possibleConvergingInputEvent = e.meta.input && divergentIndex !== undefined
  const test = possibleConvergingInputEvent && tests[selectedTestId]
  if (!test) return 

  const eventsCombined = combineInputEvents([...events, e])
  
  const eventsFromTestSoFar = test.events.slice(0, eventsCombined.length)
  const manuallyEnteredInputValues = isEqualDeepPartial(eventsFromTestSoFar, eventsCombined) // save some cycles, and don't revive which likely isn't necessary for input events

  if (manuallyEnteredInputValues) {
    state.evs = test.events                     // display all events from test, having only tested isEqual on the number of events dispatched factoring in combined form events
    state.evsIndex = eventsCombined.length - 1  // there will be less events won't combined, and the last event is now the index
    delete state.divergentIndex                 // no longer divergent!
    return true
  }
}
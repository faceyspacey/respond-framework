import combineInputEvents from '../../modules/replayTools/helpers/combineInputEvents.js'
import { isEqualDeepPartial } from '../../utils/isEqual.js'
import { mergePrevState } from '../hydrateModules.js'
import { push } from '../../history/changePath.js'
import { hasHistory, isTest } from '../../helpers/constants.js'
import bs from '../../history/browserState.js'
import { _branch } from '../reserved.js'
import { urlToLocation } from '../../helpers/url.js'


export default function (state, e) {
  if (!e.meta.trigger) return

  const { topState, replayState } = state.respond
  const { respond, replayTools } = topState

  const isSession = replayState.status === 'session'

  replayState.status = 'reload'
  respond.mem.changedPath = false

  if (hasHistory && bs.maxIndex < 2 && !e.event.pattern && !respond.history.state.pop) {
    const { url } = urlToLocation(window.location)
    push(url) // optimization / browser history workaround: push the same url for first 2 non-navigation events, so history trap is enabled after first navigation event, where it usually wouldn't be (because it requires 2 pushes to become enabled)
  }

  if (isSession) {
    const refresh = respond.prevUrl === respond.fromEvent(e)?.url
    if (refresh) return false // refresh, so nothing needs to happen (but if the URL was changed, we still want to honor it)
  }

  if (e.event[_branch] === 'replayTools' && !replayTools.config.log) {
    mergePrevState(replayTools, respond.snapshot(replayTools))
    return
  }

  if (!e.meta.skipped) {
    mergePrevState(topState, respond.snapshot(topState))
  }

  if (!replayTools || isTest) return

  sendTrigger(e, replayTools, topState)

  if (e.meta.skipped) {
    // respond.devtools.forceNotification({ ...e, __prefix: '-- ' })
    return false
  }
}



const sendTrigger = (e, state, topState) => {
  const index = ++state.evsIndex

  if (state.playing) {
    state.evs[index] = e // event from tests isn't fully created yet, so we need to manually add it to the events array
    return // during replays we preserve the events array, but move through it by index only, so you can see completed events in green, and yet to be dispatched rows in white (or purple)
  }
  
  const events = state.evs

  const prev = events[index - 1]
  const dispatchedSameAsSkippedEvent = prev?.meta?.skipped && isEqual(prev, e, topState)

  if (dispatchedSameAsSkippedEvent) {
    delete prev.meta.skipped // ux optimization: user desired to unskip it by manually performing the same event
    return
  }

  if (state.spliceMode) return handleSpliceMode(e, state, events, index, topState)

  const lastEntryIndex = events.length - 1
  const shouldClipTail = index <= lastEntryIndex

  if (shouldClipTail) {
    const dispatchedSameEvent = clipTail(e, state, events, index, topState)
    if (dispatchedSameEvent) return // ux optimization: do nothing, as index increment resolves this automatically
  }

  if (inputConverged(e, state, events)) return // ux optimization: undo divergence + combine into single input event if user manually enters same input value after multiple keystrokes!
    
  events.push(e)
}





// helpers

const handleSpliceMode = (e, state, events, index, topState) => {
  if (!events[index]) return events.push(e) // already at tail
  if (isEqual(events[index], e, topState)) return // dispatchedSameEvent
    
  events.splice(index, 0, e)

  if (!state.divergentIndex || index < state.divergentIndex) {
    state.divergentIndex = index
  }
}



const clipTail = (e, state, events, index, topState) => {
  const next = events[index]
  if (isEqual(next, e, topState)) return true // user manually performed next event in sequence, so act as if there was no divergence

  events.splice(index)
  state.divergentIndex = index
}



const isEqual = (a, b, topState) => {
  if (a.event.type !== b.event.type) return false
  const arg = topState.respond.revive(a.arg || {})   // revive possible event function references in test arg
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
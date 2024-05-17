import { reviveObject } from '../utils/jsonReplacerReviver.js'
import combineInputEvents from '../devtools/utils/combineInputEvents.js'
import { isEqualDeepPartial } from '../utils/isEqual.js'
import { prependModulePathToE as fullPath } from '../utils/sliceByModulePath.js'
import { isProd } from '../utils/bools.js'
import sessionStorage from '../utils/sessionStorage.js'


export default function (store, eSlice, fullModulePathAlready = false) {
  if (eSlice.modulePath === 'replayTools' && !this.options.log) {
    store.prevState.replayTools = store.getSnapshot(true).replayTools
    return
  }

  store = store.getStore()
  
  const e = fullModulePathAlready ? eSlice : fullPath(eSlice)
  const state = store.state.replayTools

  if (!e.meta?.skipped) {
    store.prevState = store.getSnapshot(true)
  }

  if (isProd && !store.options.productionReplayTools) return

  sendTrigger(e, state, store.events, this.playing)

  if (e.meta?.skipped) {
    store.devtools.forceNotification({ ...e, __prefix: '-- ' })
  }

  if (state.persist && !this.playing) {
    const json = store.stringifyState(state)
    sessionStorage.setItem('replayToolsState', json)
  }
}


const sendTrigger = (e, state, storeEvents, playing) => {
  const index = ++state.evsIndex
  if (playing) return // during replays we preserve the events array, but move through it by index only, so you can see completed events in green, and yet to be dispatched rows in white (or purple)

  const events = state.evs

  const prev = events[index - 1]
  const dispatchedSameAsSkippedEvent = prev?.meta?.skipped && isEqual(prev, e)

  if (dispatchedSameAsSkippedEvent) {
    delete prev.meta.skipped // ux optimization: user desired to unskip it by manually performing the same event
    return
  }

  const lastEntryIndex = events.length - 1
  const shouldClipTail = index <= lastEntryIndex

  if (shouldClipTail) {
    const dispatchedSameEvent = clipTail(e, state, events, index, storeEvents)
    if (dispatchedSameEvent) return // ux optimization: do nothing, as index increment resolves this automatically
  }

  if (inputConverged(e, state, events)) return // ux optimization: undo divergence + combine into single input event if user manually enters same input value after multiple keystrokes!
    
  events.push(e)
}



// helpers

const clipTail = (e, state, events, index, storeEvents) => {
  const next = events[index]
  if (isEqual(next, e, storeEvents)) return true // user manually performed next event in sequence, so act as if there was no divergence

  events.splice(index)
  state.divergentIndex = index
}



const isEqual = (a, b, events) => {
  if (a.type !== b.type) return false

  const arg = reviveObject(events, a.arg || {})   // revive possible event function references in test arg

  return isEqualDeepPartial(arg, b.arg)           // e.arg may have some unrelated nested functions -- matching everything in arg works well for this case
}



const inputConverged = (e, state, events) => {
  const isPossibleConvergingInputEvent = state.selectedTestId && e.meta.input && state.divergentIndex !== undefined
  if (!isPossibleConvergingInputEvent) return

  const test = state.tests[state.selectedTestId]
  const eventsCombined = combineInputEvents([...events, e])
  
  const eventsFromTestSoFar = test.events.slice(0, eventsCombined.length)
  const manuallyEnteredInputValues = isEqualDeepPartial(eventsFromTestSoFar, eventsCombined) // save some cycles, and don't reviveObject which likely isn't necessary for input events

  if (manuallyEnteredInputValues) {
    state.evs = test.events                     // display all events from test, having only tested isEqual on the number of events dispatched factoring in combined form events
    state.evsIndex = eventsCombined.length - 1  // there will be less events won't combined, and the last event is now the index
    delete state.divergentIndex                 // no longer divergent!
    return true
  }
}
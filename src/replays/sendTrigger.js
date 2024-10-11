import revive from '../utils/revive.js'
import combineInputEvents from '../devtools/utils/combineInputEvents.js'
import { isEqualDeepPartial } from '../utils/isEqual.js'
import { prependModulePathToE as fullPath } from '../utils/sliceByModulePath.js'
import sessionStorage from '../utils/sessionStorage.js'
import { mergeModulesPrevState } from '../store/mergeModules.js'
import { snapDeepClone } from '../proxy/snapshot.js'




export default function (store, eSlice, fullModulePathAlready = false) {
  store = store.getStore()
  const state = store.replayTools

  if (eSlice.modulePath === 'replayTools' && !this.options.log) {
    // mergeModulesPrevState(state, store.snapshot(state))
    mergeModulesPrevState(state, snapDeepClone(state))
    return
  }
  
  const e = fullModulePathAlready ? eSlice : fullPath(eSlice)

  if (!e.meta?.skipped) {
    // mergeModulesPrevState(store, store.snapshot(store))
    mergeModulesPrevState(store, snapDeepClone(store))
  }

  if (!store.replayTools) return

  sendTrigger(e, state, store, this.playing)

  if (e.meta?.skipped) {
    store.devtools.forceNotification({ ...e, __prefix: '-- ' })
  }

  if (state.persist && !this.playing) {
    const json = store.stringifyState(state)
    sessionStorage.setItem('replayToolsState', json)
  }
}


const sendTrigger = (e, state, store, playing) => {
  const index = ++state.evsIndex
  if (playing) return // during replays we preserve the events array, but move through it by index only, so you can see completed events in green, and yet to be dispatched rows in white (or purple)

  const events = state.evs

  const prev = events[index - 1]
  const dispatchedSameAsSkippedEvent = prev?.meta?.skipped && isEqual(prev, e, store)

  if (dispatchedSameAsSkippedEvent) {
    delete prev.meta.skipped // ux optimization: user desired to unskip it by manually performing the same event
    return
  }

  const lastEntryIndex = events.length - 1
  const shouldClipTail = index <= lastEntryIndex

  if (shouldClipTail) {
    const dispatchedSameEvent = clipTail(e, state, events, index, store)
    if (dispatchedSameEvent) return // ux optimization: do nothing, as index increment resolves this automatically
  }

  if (inputConverged(e, state, events)) return // ux optimization: undo divergence + combine into single input event if user manually enters same input value after multiple keystrokes!
    
  events.push(e)
}



// helpers

const clipTail = (e, state, events, index, store) => {
  const next = events[index]
  if (isEqual(next, e, store)) return true // user manually performed next event in sequence, so act as if there was no divergence

  events.splice(index)
  state.divergentIndex = index
}



const isEqual = (a, b, store) => {
  if (a.type !== b.type) return false

  const arg = revive(store)(a.arg || {})   // revive possible event function references in test arg

  return isEqualDeepPartial(arg, b.arg)           // e.arg may have some unrelated nested functions -- matching everything in arg works well for this case
}



const inputConverged = (e, state, events) => {
  const isPossibleConvergingInputEvent = state.selectedTestId && e.meta.input && state.divergentIndex !== undefined
  if (!isPossibleConvergingInputEvent) return

  const test = state.tests[state.selectedTestId]
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
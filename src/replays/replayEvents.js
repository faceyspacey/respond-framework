import timeout from '../utils/timeout.js'
import storage from '../utils/storage.js'
import preserveBuiltInSettings from './helpers/preserveBuiltInSettings.js'
import { reviveEventFunctionReferences as revive } from '../utils/jsonReplacerReviver.js'
import createStore from '../store/createStore.js'


export default async function(events, delay = 0, settings = this.settings) {
  this.store.state.replayTools.playing = this.playing = false // stop possible previous running replay
  
  const nextSettings = preserveBuiltInSettings(settings, this.store)

  const store = createStore(this.store.topModuleOriginal, nextSettings)
  const eventsRevived = revive(store.events, events)

  store.state.replayTools = this.store.snapshot(this.store.state.replayTools)
  store.state.replayTools.evs = revive(store.events, store.state.replayTools.evs)

  return runEvents(store, eventsRevived, delay)
}



const runEvents = async (store, events, delay) => {         // keep in mind store and store.replays will now be in the context of the next next store
  const state = store.state.replayTools

  delay = delay === true ? (store.replays.settings.testDelay || 1500) : delay

  if (!delay) window.isFastReplay = true                    // turn animations + timeouts off
  
  store.replays.playing = true                              // so sendTrigger knows to only increment the index of events it's already aware of
  state.playing = !!delay                                   // display display STOP REPLAY button (and allow replay to progress), but only when there's a delay (otherwise it's instant and shouldn't flicker red)

  state.evsIndex = -1                                       // start from the top, as index will increase with each event dispatched below

  const last = events.length - 1

  window.__idCounter = 10000

  for (let i = 0; i < events.length; i++) {
    if (delay && !state.playing) break

    const { event, arg, meta } = events[i]

    if (i === last) state.playing = false                   // change red STOP REPLAY button green SAVE TEST button instantly on last event before dispatch resolves + timeout

    await event.dispatch(arg,  { ...meta, trigger: true })

    if(i === 0 && delay) store.render()                     // render app after first event, so we can see subsequent events

    if (!meta?.skipped) await timeout(delay)
  }

  state.playing = store.replays.playing = false

  if (!delay) store.render()                                // if no delay, only render once events are done and state is fully updated for a clean single re-render

  requestIdleCallback(() => window.isFastReplay = false)    // concurrent React 18 renders asyncronously, and this is the recommended substitute for the old ReactDOM.render(,,CALLBACK)

  storage.local.replaySettings = JSON.stringify(store.replays.settings)

  if (state.persist) {
    storage.session.replayToolsState = store.stringifyState(state)
  }

  return store
}
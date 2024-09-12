import preserveBuiltInSettings from './helpers/preserveBuiltInSettings.js'
import { reviveEventFunctionReferences as revive } from '../utils/jsonReplacerReviver.js'
import createStore from '../store/createStore.js'
import sessionStorage from '../utils/sessionStorage.js'
import localStorage from '../utils/localStorage.js'
import { proxyStates } from '../proxy/utils/helpers.js'


export default async function(events, delay = 0, settings = this.settings) {
  this.store.state.replayTools.playing = this.playing = false // stop possible previous running replay
  
  const nextSettings = preserveBuiltInSettings(settings, this.store)

  const store = await createStore(this.store.topModuleOriginal, nextSettings)
  const eventsRevived = revive(store.events, events)

  const { replayTools } = this.store.state
  
  store.state.replayTools = replayTools
  store.state.replayTools.evs = revive(store.events, replayTools.evs)

  proxyStates.get(replayTools).remove(proxyStates.get(this.store.state).notify)

  return runEvents(store, eventsRevived, delay)
}



const runEvents = async (store, events, delay) => {         // keep in mind store and store.replays will now be in the context of the next next store
  const state = store.state.replayTools

  delay = delay === true ? (store.replays.settings.testDelay || 1500) : delay

  window.ignoreChangePath = true
  window.isReplay = true
  if (!delay) window.isFastReplay = true                    // turn animations + timeouts off
  
  store.replays.playing = true                              // so sendTrigger knows to only increment the index of events it's already aware of
  state.playing = !!delay                                   // display display STOP REPLAY button (and allow replay to progress), but only when there's a delay (otherwise it's instant and shouldn't flicker red)

  state.evsIndex = -1                                       // start from the top, as index will increase with each event dispatched below

  const last = events.length - 1

  window.__idCounter = 10000
  
  for (let i = 0; i < events.length; i++) {
    if (delay && !state.playing) break

    const { event, arg, meta } = events[i]

    if (i === last) {
      window.ignoreChangePath = false
      state.playing = false                   // change red STOP REPLAY button to green SAVE TEST button instantly on last event before dispatch resolves + timeout
    }

    await event.dispatch(arg,  { ...meta, trigger: true })

    if(i === 0 && delay) store.render()                     // render app after first event, so we can see subsequent events

    if (!meta?.skipped) await timeout(delay)
  }

  state.playing = store.replays.playing = false

  if (!delay) store.render()                                // if no delay, only render once events are done and state is fully updated for a clean single re-render

  setTimeout(() => {
    window.isReplay = false
    window.isFastReplay = false
  }, 100)                                                        // concurrent React 18 renders asyncronously, and this is the recommended substitute for the old ReactDOM.render(,,CALLBACK)

  const json = JSON.stringify(store.replays.settings)
  await localStorage.setItem('replaySettings', json)

  if (state.persist) {
    const json = store.stringifyState(state)
    await sessionStorage.setItem('replayToolsState', json)
  }

  return store
}


const timeout = (ms = 300) => {
  const dontAwait = !ms || process.env.NODE_ENV === 'test'
  if (dontAwait) return
  return new Promise(res => setTimeout(res, ms))
}





export async function restoreEvents() {         // keep in mind store and store.replays will now be in the context of the next next store
  const state = this.store.state.replayTools
  const events = state.evs.slice(0, state.evsIndex + 1)

  state.evsIndex = -1

  window.ignoreChangePath = window.isReplay = window.isFastReplay = true
  state.playing = this.playing = true              // so sendTrigger knows to only increment the index of events it's already aware of

  for (let i = 0; i < events.length; i++) {
    const { event, arg, meta } = events[i]
    await event.dispatch(arg,  { ...meta, trigger: true })
  }

  window.ignoreChangePath = window.isReplay = window.isFastReplay = false
  state.playing = this.playing = false
}
import preserve from './helpers/preserveBuiltInSettings.js'
import createState from '../store/createState.js'
import sessionStorage from '../utils/sessionStorage.js'
import localStorage from '../utils/localStorage.js'
import revive from '../utils/revive.js'


export default async function(events, delay = 0, settings = this.settings) {
  this.store.replayTools.playing = this.playing = false // stop possible previous running replay

  const setts = preserve(settings, this.store)
  const store = await createState(this.store.top, { settings: setts, replay: true })

  return run(events, delay, store)
}



const run = async (events, delay, store) => {         // keep in mind store and store.replays will now be in the context of the next next store
  const evs = revive(store)(events)
  const state = store.replayTools

  const { respond } = store
  const { ctx } = respond

  delay = delay === true ? (respond.replays.settings.testDelay || 1500) : delay

  ctx.ignoreChangePath = true
  ctx.isReplay = true
  if (!delay) ctx.isFastReplay = true                    // turn animations + timeouts off
  
  respond.replays.playing = true                         // so sendTrigger knows to only increment the index of events it's already aware of
  state.playing = !!delay                                // display display STOP REPLAY button (and allow replay to progress), but only when there's a delay (otherwise it's instant and shouldn't flicker red)

  state.evsIndex = -1                                    // start from the top, as index will increase with each event dispatched below

  const last = evs.length - 1

  window.__idCounter = 10000
  
  for (let i = 0; i < evs.length; i++) {
    if (delay && !state.playing) break

    const { event, arg, meta } = evs[i]

    if (i === last) {
      ctx.ignoreChangePath = false
      state.playing = false                   // change red STOP REPLAY button to green SAVE TEST button instantly on last event before dispatch resolves + timeout
    }

    await event.dispatch(arg,  { ...meta, trigger: true })

    if(i === 0 && delay) store.render()                     // render app after first event, so we can see subsequent events

    if (!meta?.skipped) await timeout(delay)
  }

  state.playing = store.replays.playing = false

  if (!delay) store.render()                                // if no delay, only render once events are done and state is fully updated for a clean single re-render

  setTimeout(() => {
    ctx.isReplay = false
    ctx.isFastReplay = false
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





export async function restoreEvents() {         // keep in mind store and store.replays will now be in the context of the next store
  const state = this.store.replayTools
  const events = state.evs.slice(0, state.evsIndex + 1)
  const { ctx } = this.store

  state.evsIndex = -1

  ctx.ignoreChangePath = ctx.isReplay = ctx.isFastReplay = true
  state.playing = this.playing = true              // so sendTrigger knows to only increment the index of events it's already aware of

  for (let i = 0; i < events.length; i++) {
    const { event, arg, meta } = events[i]
    await event.dispatch(arg,  { ...meta, trigger: true })
  }

  ctx.ignoreChangePath = ctx.isReplay = ctx.isFastReplay = false
  state.playing = this.playing = false
}
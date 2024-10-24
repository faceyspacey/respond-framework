import createState from '../store/createState.js'
import revive from '../utils/revive.js'


export default async function(events, delay = 0, settings = this.settings) {
  const top = this.getTopState()
  top.replayTools.playing = this.playing = false // stop possible previous running replay

  const setts = preserveBuiltInSettings(settings, top)
  const store = await createState(top.top, { settings: setts, status: 'replay' })

  return run(events, delay, store)
}



const run = async (events, delay, store) => {           // keep in mind store and store.replays will now be in the context of the next next store
  const evs = revive(store)(events)
  const state = store.replayTools

  const { respond } = store
  const { ctx } = respond

  delay = delay === true ? (respond.replays.settings.testDelay || 1500) : delay

  respond.replays.playing = true                         // so sendTrigger knows to only increment the index of events it's already aware of
  ctx.isFastReplay = !delay                    // turn animations + timeouts off
  
  const last = evs.length - 1

  for (let i = 0; i < evs.length; i++) {
    if (delay && !state.playing) break

    const { event, arg, meta } = evs[i]

    if (i === last) {
      state.playing = false                   // change red STOP REPLAY button to green SAVE TEST button instantly on last event before dispatch resolves + timeout
    }

    await event.dispatch(arg,  { ...meta, trigger: true })

    if(i === 0 && delay) store.render()                     // render app after first event, so we can see subsequent events

    if (!meta?.skipped) await timeout(delay)
  }

  store.replays.playing = false
  ctx.isFastReplay = false

  if (!delay) store.render()                                // if no delay, only render once events are done and state is fully updated for a clean single re-render

  setTimeout(() => {
    respond.queueSaveSession()
  }, 100)                                                        // concurrent React 18 renders asyncronously, and this is the recommended substitute for the old ReactDOM.render(,,CALLBACK)

  return store
}


const timeout = (ms = 300) => {
  const dontAwait = !ms || process.env.NODE_ENV === 'test'
  if (dontAwait) return
  return new Promise(res => setTimeout(res, ms))
}



const preserveBuiltInSettings = (settings, store) => {
  const { config, settings: sets } = store.replays

  return Object.keys(config).reduce((acc, k) => {
    if (config[k].builtIn) {
      acc[k] = sets[k] // preserve builtIn settings
    }

    return acc
  }, { ...settings })
}
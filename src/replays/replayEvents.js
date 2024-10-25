import createState from '../store/createState.js'
import revive from '../utils/revive.js'
import { isTest } from '../utils/bools.js'


export default async function(events, delay = 0, settings = this.settings) {
  const top = this.getTopState()

  const setts = preserveBuiltInSettings(settings, top)
  const store = await createState(top.top, { settings: setts, status: 'replay' })

  await run(revive(store)(events), delay, store.respond)

  return store
}



const run = async (events, delay, respond) => {           // keep in mind store and store.replays will now be in the context of the next next store
  const { ctx, replays } = respond

  window.store.replays.playing = true                         // so sendTrigger knows to only increment the index of events it's already aware of
  ctx.isFastReplay = !delay                    // turn animations + timeouts off

  for (let i = 0; i < events.length && replays.playing; i++) {
    const { event, arg, meta } = events[i]
    await event.dispatch(arg,  { ...meta, trigger: true })

    const first = i === 0
    const last =  i === events.length - 1

    if (last) ctx.isFastReplay = false
    if (delay ? first : last) respond.render()                     // with delay, only render first event as dispatches will automatically render subsequent events : otherwise only render after all events have instantly replayed
    
    await timeout(delay, replays.settings, meta, last)
  }

  window.store.replays.playing = false
  ctx.isFastReplay = false

  respond.queueSaveSession()                                                      // concurrent React 18 renders asyncronously, and this is the recommended substitute for the old ReactDOM.render(,,CALLBACK)
}






const timeout = (delay, settings, meta, last) => {
  if (!delay || isTest || meta?.skipped || last) return
  const ms = delay !== true ? delay : settings.testDelay || 1500
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
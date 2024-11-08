import createState from '../store/createState.js'
import revive from '../utils/revive.js'
import { isTest } from '../utils/bools.js'


export default async function(events, delay = 0, settings = this.replayState.settings, focusedModulePath = this.replayState.focusedModulePath) {
  const state = createState(window.state.respond.top, { settings, focusedModulePath, status: 'replay' })
  await run(revive(store)(events), delay, state.respond, state.replayTools)
  return state
}



const run = async (events, delay, respond, replayTools) => {           // keep in mind store and store.replays will now be in the context of the next next store
  const { ctx, options } = respond
  
  replayTools.playing = true                         // so sendTrigger knows to only increment the index of events it's already aware of
  ctx.isFastReplay = !delay                    // turn animations + timeouts off

  for (let i = 0; i < events.length && replayTools.playing; i++) {
    const { event, arg, meta } = events[i]
    await event.dispatch(arg,  { ...meta, trigger: true })

    const first = i === 0
    const last =  i === events.length - 1

    if (last) ctx.isFastReplay = false                  // allow last event to trigger animations
    if (delay ? first : last) respond.render()                     // with delay, only render first event as dispatches will automatically render subsequent events : otherwise only render after all events have instantly replayed
    
    await timeout(delay, meta, last, options.testDelay)
  }

  replayTools.playing = false
  ctx.isFastReplay = false

  respond.queueSaveSession()                                                      // concurrent React 18 renders asyncronously, and this is the recommended substitute for the old ReactDOM.render(,,CALLBACK)
}






const timeout = (delay, meta, last, testDelay = 1500) => {
  if (isTest || !delay || meta?.skipped || last) return
  const ms = delay !== true ? delay : testDelay
  return new Promise(res => setTimeout(res, ms))
}
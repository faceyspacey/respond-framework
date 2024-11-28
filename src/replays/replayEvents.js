import createState from '../store/createState.js'
import { isTest } from '../utils/bools.js'
import revive from '../utils/revive.js'


export default async function(events, delay = 0, { settings, branch } = this.topState.replayState) {
  const start = performance.now()

  this.playing = false // stop possible previous running replay

  const state = createState(window.state.respond.top, { settings, branch, status: 'replay' })
  console.log('replayEvents.createModule', performance.now() - start)

  const last = performance.now()
  // const e = events[0]
  // const { eventsByType } = state.respond
  // if (typeof e.event !== 'function' || eventsByType[e.type] !== e.event) {
  //   events = revive(state.respond)(events)
  // }

  events = revive(state.respond)(events)
  console.log('events', events)

  await run(events, delay, state)
  console.log('replayEvents.run', performance.now() - last)

  return state
}



const run = async (events, delay, { respond, replayTools }) => {           // keep in mind we will now be in the context of a new state
  const { ctx, options } = respond
  
  replayTools.playing = true                         // so sendTrigger knows to only increment the index of events it's already aware of
  ctx.isFastReplay = !delay                    // turn animations + timeouts off

  for (let i = 0; i < events.length && replayTools.playing; i++) {
    const first = i === 0
    const last =  i === events.length - 1

    const { event, arg, meta } = events[i]
    await event.trigger(arg,  meta)

    if (last) ctx.isFastReplay = false                  // allow last event to trigger animations
    if (delay ? first : last) respond.render()                     // with delay, only render first event as dispatches will automatically render subsequent events : otherwise only render after all events have instantly replayed
    
    await timeout(delay, meta, last, options.testDelay)
  }

  respond.state.replayTools.playing = false // proxy, whereas until render it wasn't a proxy, but now we need it reactive to display STOP REPLAY
  ctx.isFastReplay = false

  respond.queueSaveSession()                                                      // concurrent React 18 renders asyncronously, and this is the recommended substitute for the old ReactDOM.render(,,CALLBACK)
}






const timeout = (delay, meta, last, testDelay = 1500) => {
  if (isTest || !delay || meta?.skipped || last) return
  const ms = delay !== true ? delay : testDelay
  return new Promise(res => setTimeout(res, ms))
}
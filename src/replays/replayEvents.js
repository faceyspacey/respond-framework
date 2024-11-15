import createState from '../store/createState.js'
import { isTest } from '../utils/bools.js'


export default async function(events, delay = 0, settings = this.topState.replayState.settings, focusedBranch = this.topState.replayState.focusedBranch) {
  const start = new Date

  this.playing = false // stop possible previous running replay

  const state = createState(window.state.respond.top, { settings, focusedBranch, status: 'replay' })
  console.log('replayEvents.createModule', new Date - start)

  const last = new Date
  await run(events, delay, state)
  console.log('replayEvents.run', new Date - last)

  console.log('replayEvents', new Date - start)
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
    await event.dispatch(arg,  { ...meta, trigger: true })

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
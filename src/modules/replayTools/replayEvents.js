import createModule from '../../createModule/index.js'
import { isTest } from '../../helpers/constants.js'
import revive from '../../createModule/helpers/revive.js'


export default async function(events, delay = 0, { settings, branch } = this.respond.replayState) {
  this.playing = false // stop possible previous running replay
  const respond = createModule(window.state.respond.top, { settings, branch, status: 'replay' })
  events = maybeRevive(events, respond)
  await runEvents(events, delay, respond.state)
  return respond.state
}



export const runEvents = async (events, delay, { respond, replayTools }, dontRender, startTime = performance.now()) => {           // keep in mind we will now be in the context of a new state
  const { mem, options } = respond
  
  replayTools.playing = true                         // so sendTrigger knows to only increment the index of events it's already aware of
  mem.isFastReplay = !delay                    // turn animations + timeouts off

  for (let i = 0; i < events.length && replayTools.playing; i++) {
    const first = i === 0
    const last =  i === events.length - 1

    const { event, arg, meta } = events[i]
    await event.trigger(arg,  meta)

    if (last) mem.isFastReplay = false                  // allow last event to trigger animations
    if (delay ? first : last && !dontRender) respond.render({}, { startTime, last })                     // with delay, only render first event as dispatches will automatically render subsequent events : otherwise only render after all events have instantly replayed
    
    await timeout(delay, meta, last, options.testDelay)
  }

  respond.state.replayTools.playing = false // proxy, whereas until render it wasn't a proxy, but now we need it reactive to display STOP REPLAY
  mem.isFastReplay = false

  respond.queueSaveSession()                                                      // concurrent React 18 renders asyncronously, and this is the recommended substitute for the old ReactDOM.render(,,CALLBACK)
}






const timeout = (delay, meta, last, testDelay = 1500) => {
  if (isTest || !delay || meta?.skipped || last) return
  const ms = delay !== true ? delay : testDelay
  return new Promise(res => setTimeout(res, ms))
}



const maybeRevive = (events, respond) => {
  const e = events[0]

  return typeof e.event !== 'function' || respond.eventsByType[e.event.type] !== e.event
    ? console.log('maybeRevive') || revive(respond)(events)
    : events
}
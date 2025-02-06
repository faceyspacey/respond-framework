import { runEvents } from '../../modules/replayTools/replayEvents.js'
import { isNative } from '../../utils.js'


export default async function reduce(...events) {
  const { status } = this.replayState

  switch (status) {
    case 'reload':
      if (events.length === 1) await events[0].trigger()
      else                     await runEvents(events, 0, this.state, true) // pass true to block render, as it's expected to happen in userland when status === 'reload'
      break

    case 'session':
      const { evs, evsIndex } = this.state.replayTools

      const e = isNative
        ? evs[evsIndex] ?? evs.at(-1) ?? events[0]
        : this.eventFrom(window.location) ?? events[0]

      if (!e) throw new Error(`respond: no event matches ${isNative ? 'event passed to reduce' : window.location.href}`)
      await e.trigger() // only need to trigger one event since session status doesn't actually re-run any events; instead on first dispatch triggerPlugin bails out if the URL of last event matches prevUrl; however, if the user changed the URL, it will be triggered, and here we capture that case
      break

    case 'replay':
    default:
      await runEvents(events, 0, this.state)
  }

  return this.state
}
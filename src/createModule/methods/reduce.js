import { runEvents } from '../../modules/replayTools/replayEvents.js'


export default async function reduce(...events) {
  const { status } = this.replayState

  if (events.length === 1) {
    const e = events[0]
    await e.trigger()
  }
  else if (status === 'session') { // only need to trigger one event since session status doesn't actually re-run any events; instead on first dispatch triggerPlugin bails out if the URL of last event matches prevUrl; however, if the user changed the URL, it will be triggered, and here we capture that case
    const e = this.fromEvent(window.location)
    await e.trigger()
  }
  else {
    const blockRender = this.replayState.status === 'reload' // hmr-replay status needs to call render in runEvents -- otherwise, render is expected to be called if a an app that hasn't been rendered yet, or if it's already been rendered, nothing needs to happen, as the app will update reactively automatically
    await runEvents(events, 0, this.state, blockRender)
  }

  return this.state
}
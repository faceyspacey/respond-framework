import { runEvents } from '../../modules/replayTools/replayEvents.js'

export default async function reduce(...events) {
  const { status } = this.replayState

  if (events.length === 1 || status === 'session') {
    const e = events[0]
    await e.trigger()
  }
  else {
    const blockRender = this.replayState.status === 'reload'
    await runEvents(events, 0, this.state, blockRender)
  }

  return this.state
}
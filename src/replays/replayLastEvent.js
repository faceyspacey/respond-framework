export default async function() {
  const { replayTools, devtools, ctx, eventsByType } = this.store

  const events = getEventsWithPreviousIfSkipped(replayTools) 
  const n = { type: 'HMR', __prefix: '@@', __developer: 'State reset to before replayed event.' }

  const { evs } = replayTools
  const { length } = events

  evs.splice(evs.length - length, length)  // remove the events displayed in replayTools that are about to be replayed
  replayTools.evsIndex -= length

  ctx.init = !!events[0]?.init            // tell start plugin the event dispatched should be treated as the init event

  devtools.forceNotification(n, this.store)

  for (let i = 0; i < length; i++) {
    const { type, arg, meta } = events[i]
    const event = eventsByType[type]

    await event.dispatch(arg, { ...meta, trigger: true })
  }
}


// dx optimization:

const getEventsWithPreviousIfSkipped = ({ evs, evsIndex: i }) => {
  const curr = evs[i]
  if (!curr) return []

  if (curr.meta?.skipped) {
    const start = evs.slice(0, i).findLastIndex(e => !e.meta?.skipped) // if the replayed event is skipped, go back to the first non-skipped event so that reducers and HMR can be triggered for something (note: this will actually be the correct prevState, since prevState isn't created for skipped events)
    return start === -1 ? [] : evs.slice(start)
  }

  return [curr]
}
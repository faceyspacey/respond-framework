import { reviveEventFunctionReferences } from '../utils/jsonReplacerReviver.js'
import sliceByModulePath from '../utils/sliceByModulePath.js'


export default async function(store) {
  try {
    const state = store.state.replayTools
    const { evs, evsIndex: index } = state

    const n = { type: 'HMR', __prefix: '@@', __developer: 'State reset to before replayed event.' }
    const prevState = reviveEventFunctionReferences(store.events, store.prevState)

    store.devtools.forceNotification(n, prevState)
    store.replaceState(prevState)   // so when latest event is redispatched during HMR (i.e. the dispatch below), it's performed against the same state it was initially peformed against

    const events = getEventsWithPreviousIfSkipped(evs, index) 

    store.ctx.init = !!events[0]?.init  // tell start plugin the event dispatched should be treated as the init event

    for (let i = 0; i < events.length; i++) {
      const { type, arg, meta } = events[i]
      const event = sliceByModulePath(store.events, type)

      await event.dispatch(arg, { ...meta, trigger: true })
    }

    if (events.length > 0) { // if you skipped all events, don't render and possibly cause errors (i.e. preserve the old dom); let them figure out to unskip
      store.render()
    }
  }
  catch (error) {
    console.error('[RESPOND] HMR triggered an error replaying the most recent event.', error)
  }
}


// dx optimization:

const getEventsWithPreviousIfSkipped = (events, index) => {
  const curr = events[index]
  if (!curr) return []

  if (curr.meta?.skipped) {
    const start = events.slice(0, index).findLastIndex(e => !e.meta?.skipped) // if the replayed event is skipped, go back to the first non-skipped event so that reducers and HMR can be triggered for something (note: this will actually be the correct prevState that is replaced above, since prevState isn't created for skipped events)
    return start === -1 ? [] : events.slice(start)
  }

  return [curr]
}
import sliceByModulePath from '../utils/sliceByModulePath.js'


export default async function() {
  try {
    const { store } = this

    const state = store.replayTools
    const { evs, evsIndex: index } = state

    const n = { type: 'HMR', __prefix: '@@', __developer: 'State reset to before replayed event.' }

    store.devtools.forceNotification(n, store)

    const events = getEventsWithPreviousIfSkipped(evs, index) 

    store.ctx.init = !!events[0]?.init  // tell start plugin the event dispatched should be treated as the init event

    window.ignoreChangePath = window.isReplay = window.isFastReplay = true
    store.replayTools.playing = this.playing = false // ensure SAVE TEST button is green, as prevState may have had it playing

    for (let i = 0; i < events.length; i++) {
      const { type, arg, meta } = events[i]
      const event = sliceByModulePath(store.events, type)

      await event.dispatch(arg, { ...meta, trigger: true })
    }

    if (events.length > 0) { // if you skipped all events, don't render and possibly cause errors (i.e. preserve the old dom); let them figure out to unskip
      store.render()
    }

    setTimeout(() => {
      window.ignoreChangePath = window.isReplay = window.isFastReplay = false
    }, 100)
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
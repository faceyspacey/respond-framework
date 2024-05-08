import replayEvents from '../../../replays/replayEvents.js'


export default {
  load: async store => {
    const restoreSession = !window.__sessionRestored && store.state.evs.length > 0 // evs will only exist if __replayToolState restored in initialState function
    window.__sessionRestored = true // only call once on refresh (and also not on replays after persist is turned on in the same session)

    if (!restoreSession) return

    store.ctx.ignoreTrigger = true    // tell start plugins (of current store) to not call sendTrigger, as we do not want to add to the current state (eg state.evs) and since we are rebuilding/replaying the store anyway

    const { replays, state } = store
    const events = state.evs.slice(0, state.evsIndex + 1)

    const prevStore = store.getStore()
    const nextStore = await replays.replayEvents(events)

    Object.assign(prevStore, nextStore) // optimization: assign to prevStore reference as this function will run for the initial dispatch before store.render(), and we want store to be the result of this replay, rather than via another strategy requiring an additional render of the whole tree

    return false
  }
}
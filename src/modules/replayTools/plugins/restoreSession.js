export default {
  load: async store => {
    if (window.__sessionRestored) return
    window.__sessionRestored = true // only call once on refresh (and also not on replays after persist is turned on in the same session)

    const needsToRestoreEvents = store.state.evs.length > 0 // evs will only exist if __replayToolState restored in initialState function
    if (!needsToRestoreEvents) return
    
    await store.replays.restoreEvents()
    return false
  }
}
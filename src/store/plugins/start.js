export default (store, e) => {
  applyFirstNavigation(store, e)

  if (store.history.state.pop) {
    e.meta.pop = store.history.state.pop
  }

  if (e.event.path && store.cache?.has(e)) {
    e.meta.cached = true
  }

  if (store.replays.status === 'session') {
    store.replays.status = 'init'
    return
  }

  if (!e.meta.trigger) return
  store.replays.sendTrigger(store, e)

  if (e.meta.skipped) return false
}



const applyFirstNavigation = (store, e) => {
  if (store.getStore().__navigated) return
  if (e.kind !== store.respond.kinds.navigation) return
  if (e.meta.skipped) return

  e.meta.firstNavigation = true
}

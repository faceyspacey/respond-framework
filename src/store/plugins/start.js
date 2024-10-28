export default (store, e) => {
  const { respond } = store

  if (respond.history.state.pop) {
    e.meta.pop = respond.history.state.pop
  }

  if (e.event.path && respond.cache?.has(e)) {
    e.meta.cached = true
  }

  if (respond.replays.status === 'session') {
    respond.replays.status = 'init'
    return
  }

  if (!e.meta.trigger) return
  respond.replays.sendTrigger(store, e)

  if (e.meta.skipped) return false
}
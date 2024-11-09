export default async (state, e) => {
  if (e.meta.parallel && !e.meta.changePath) return

  if (e.event.changePath) {
    const other = e.event.changePath.call(state, state, e)
    other && state.respond.history.changePath(other)
  }
  else if (e.event.path) {
    state.respond.history.changePath(e)
  }
}
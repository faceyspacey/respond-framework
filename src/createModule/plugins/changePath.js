export default (state, e) => {
  if (e.meta.parallel && e.meta.changePath !== true) return

  if (e.event.changePath) {
    const other = e.event.changePath.call(state, state, e)
    other && state.respond.history.changePath(other)
  }
  else if (e.event.pattern) {
    state.respond.history.changePath(e)
  }
}
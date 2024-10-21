export default async (store, e) => {
  if (e.meta.parallel && !e.meta.changePath) return

  if (e.event.changePath) {
    const other = e.event.changePath.call(e.event, store, e)
    other && store.history.changePath(other)
  }
  else if (e.event.path) {
    store.history.changePath(e)
  }
}
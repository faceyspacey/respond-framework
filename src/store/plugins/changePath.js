export default async (store, e) => {
  if (e.meta.parallel && !e.meta.changePath) return

  if (e.event.path) {
    store.changePath(e)
    return
  }

  const curr = e.event.findDrainEvent?.call(e.event, store, e)

  if (curr) {
    store.changePath(curr, true)
  }
}
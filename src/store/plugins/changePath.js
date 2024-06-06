export default async (store, e) => {
  if (e.meta.parallel && !e.meta.changePath) return

  if (e.event.path) {
    store.history.changePath(e)
    return
  }

  const curr = e.event.fromEvent?.call(e.event, store, e)

  if (curr) {
    await store.history.changePath(curr)
  }
}
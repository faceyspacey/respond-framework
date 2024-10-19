export default async (store, e) => {
  if (e.meta.parallel && !e.meta.changePath) return

  if (e.event.changePath) {
    e = e.event.changePath.call(e.event, store, e)
  }

  if (!e.event.path) return
  
  store.history.changePath(e)
}
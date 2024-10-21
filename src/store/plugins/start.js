import { traverseModules } from '../../utils/sliceByModulePath.js'


export default async (store, e) => {
  if (!store.ctx.pluginsLoaded) {
    await loadPlugins(store, e)
  }

  if (store.replays.status === 'session') {
    store.replays.status = 'reload'
    store.getStore().__navigated = true
    return
  }

  applyFirstNavigation(store, e)

  if (store.history.state.pop) {
    e.meta.pop = store.history.state.pop
  }

  if (e.event.path && store.cache?.has(e)) {
    e.cached = true
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


const loadPlugins = store => {
  const promises = []
  const top = store.getStore()
  
  store.ctx.pluginsLoaded = true

  traverseModules(top, store => {
    store.plugins.forEach(p => {
      if (!p.load) return

      const promise = p.load(store)
      promises.push(promise)
    })
  })
  
  return Promise.all(promises)
}
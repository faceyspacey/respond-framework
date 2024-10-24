import { traverseModulesAsyncParallel } from '../../utils/sliceByModulePath.js'


export default async (store, e) => {
  if (!store[pluginsLoaded]) {
    await loadPlugins(store, e)
  }

  applyFirstNavigation(store, e)

  if (store.history.state.pop) {
    e.meta.pop = store.history.state.pop
  }

  if (e.event.path && store.cache?.has(e)) {
    e.cached = true
  }

  if (store.replays.status === 'session') {
    store.replays.status = 'reload'
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


const loadPlugins = state => {
  const top = state.getStore()
  state[pluginsLoaded] = true

  return traverseModulesAsyncParallel(top, state => {
    const promises = state.plugins.map(p => p.load?.(state))
    return Promise.all(promises)
  })
}

const pluginsLoaded = Symbol('pluginsLoaded') // preserve through HMR, but not sessionStorage.getItem('sessionState')
import dispatchPlugins from '../../utils/dispatchPlugins.js'
import start from '../plugins/start.js'
import { sliceEventByModulePath, traverseModulesAsyncParallel } from '../../utils/sliceByModulePath.js'


export default async function(ev, meta) {
  const e = sliceEventByModulePath(ev)
  const store = this.respond.modulePaths[e.modulePath]
  
  e.meta = { ...e.meta, ...meta }

  if (!store[pluginsLoaded]) {
    await loadPlugins(store, e)
  }

  try {
    await dispatchPlugins([start, ...store.plugins], store, e)
  }
  catch (error) {
    await store.onError({ error, kind: 'dispatch', e })
  }

  if (e.meta.trigger) await this.respond.promisesCompleted(e)
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
import dispatchPlugins from '../../utils/dispatchPlugins.js'
import { sliceEventByModulePath, traverseModulesAsyncParallel } from '../../utils/sliceByModulePath.js'


export default async function(ev, meta) {
  ev.meta = { ...ev.meta, ...meta }

  const { replays, modulePaths } = this.respond
  const { trigger, skipped } = ev.meta

  const e = sliceEventByModulePath(ev)
  const state = modulePaths[e.modulePath]

  if (replays.status === 'session') return replays.ready()
  if (!state[loaded]) await loadPlugins(state, e)
    
  if (trigger) replays.sendTrigger(state, e)
  if (skipped) return

  try {
    await dispatchPlugins(state.plugins, state, e)
  }
  catch (error) {
    await state.onError({ error, kind: 'dispatch', e })
  }

  if (trigger) await this.respond.promisesCompleted(e)
}



const loadPlugins = state => {
  const top = state.getStore()
  state[loaded] = true

  return traverseModulesAsyncParallel(top, state => {
    const promises = state.plugins.map(p => p.load?.(state))
    return Promise.all(promises)
  })
}

const loaded = Symbol('pluginsLoaded') // preserve through HMR, but not sessionStorage.getItem('sessionState')
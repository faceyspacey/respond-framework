import trigger from '../../replays/triggerPlugin.js'
import dispatchPlugins from '../../utils/dispatchPlugins.js'
import loadPluginsOnce from '../../utils/loadPlugins.js'


export default async function(e, meta) {
  if (meta) e.meta = { ...e.meta, ...meta }
  const state = e.event.module

  const prom = loadPluginsOnce(this.respond.getStore())
  if (prom instanceof Promise) await prom

  try {
    await dispatchPlugins([trigger, ...state.plugins], state, e)
  }
  catch (error) {
    await state.respond.onError({ error, kind: 'dispatch', e })
  }

  if (!e.meta.trigger) return
  await state.respond.promisesCompleted(e)
}


export function trigger(ev, meta) {
  return this.dispatch(ev, { ...meta, trigger: true })
}
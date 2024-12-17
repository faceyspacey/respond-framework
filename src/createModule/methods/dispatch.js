import triggerPlugin from '../plugins/trigger.js'
import dispatchPlugins from '../helpers/dispatchPlugins.js'
import loadPluginsOnce from '../helpers/loadPlugins.js'


export default async function(e, meta, start = performance.now()) {
  if (meta) e.meta = { ...e.meta, ...meta }
  
  const state = e.event.module

  const prom = loadPluginsOnce(this)
  if (prom instanceof Promise) await prom

  try {
    await dispatchPlugins([triggerPlugin, ...state.plugins], state, e)
  }
  catch (error) {
    await state.respond.onError({ error, kind: 'dispatch', e })
  }

  if (!e.meta.trigger) return
  await this.promisesCompleted(e)
  console.log('trigger', parseFloat((performance.now() - start).toFixed(3)), e.event.type)
}




export function trigger(e, meta) {
  e.meta = { ...e.meta, ...meta, trigger: true }
  return this.dispatch(e)
}
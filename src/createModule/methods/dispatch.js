import triggerPlugin from '../plugins/trigger.js'
import dispatchPlugins from '../helpers/dispatchPlugins.js'
import loadPluginsOnce from '../helpers/loadPlugins.js'
import { isTest } from '../../helpers/constants.js'


export default async function(e, meta) {
  const state = e.event.module
  const prom = loadPluginsOnce(this)

  if (prom instanceof Promise) await prom
  if (meta) e.meta = { ...e.meta, ...meta }

  try {
    await dispatchPlugins([triggerPlugin, ...state.plugins], state, e)
  }
  catch (error) {
    await state.respond.onError({ error, kind: 'dispatch', e })
  }

  if (!e.meta.trigger) return
  
  await this.promisesCompleted(e)
}




export function trigger(e, meta) {
  e.meta = { ...e.meta, ...meta, trigger: true }
  return this.dispatch(e)
}
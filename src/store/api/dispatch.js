import trigger from '../../replays/triggerPlugin.js'
import dispatchPlugins from '../../utils/dispatchPlugins.js'
import loadPluginsOnce from '../../utils/loadPlugins.js'
import { sliceEventByModulePath } from '../../utils/sliceByModulePath.js'


export default async function(ev, meta) {
  const e = sliceEventByModulePath(mergeMeta(ev, meta))
  const state = e.event.module

  await loadPluginsOnce(this.respond.getStore())

  try {
    await dispatchPlugins([trigger, ...state.plugins], state, e)
  }
  catch (error) {
    await state.respond.onError({ error, kind: 'dispatch', e })
  }

  if (!e.meta.trigger) return
  await state.respond.promisesCompleted(e)
}


const mergeMeta = (e, m) => m ? { ...e, meta: { ...e.meta, ...m } } : e
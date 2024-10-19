import dispatchPlugins from '../../utils/dispatchPlugins.js'
import start from '../plugins/start.js'
import { sliceEventByModulePath } from '../../utils/sliceByModulePath.js'


export default async function(ev, meta) {
  const e = sliceEventByModulePath(ev)
  const store = this.respond.modulePaths[e.modulePath]
  
  if (store.replays.session) {
    store.replays.session = false
    return
  }
  
  e.meta = { ...e.meta, ...meta }

  try {
    await dispatchPlugins([start, ...store.plugins], store, e)
  }
  catch (error) {
    await store.onError({ error, kind: 'dispatch', e })
  }

  if (e.meta.trigger) await this.respond.promisesCompleted(e)
}
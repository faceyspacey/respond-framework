import { sliceEventByModulePath } from '../../utils/sliceByModulePath.js'
import start from '../plugins/start.js'


export default async function(ev, meta) {
  ev = typeof ev === 'string' || !ev.type ? this.respond.eventFrom(ev) : ev

  const e = sliceEventByModulePath(ev)
  const store = this.respond.modulePaths[e.modulePath]
  
  e.meta = { ...e.meta, ...meta }

  if (store.history.state.pop) {
    e.meta.pop = store.history.state.pop
  }

  try {
    await dispatchPlugins([start, ...store._plugins], store, e)
  }
  catch (error) {
    await store.onError({ error, kind: 'dispatch', e })
  }

  if (e.meta.trigger) {
    await Promise.all(store.promises)
    store.promises.length = 0
    store.ctx.changedPath = !e.meta.pop ? false : store.ctx.changedPath
  }
}



const dispatchPlugins = (plugins, store, e) => {
  return next(0)

  async function next(i) {
    const plugin = plugins[i]
    if (!plugin) return

    const res = await plugin(store, e)
    if (res === false) return false

    e = res ? { ...e, ...res } : e

    return await next(i + 1)
  }
}
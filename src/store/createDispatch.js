import { sliceStoreByModulePath, sliceEventByModulePath } from '../utils/sliceByModulePath.js'
import traverseModules from '../utils/traverseModules.js'
import createPlugins from './createPlugins.js'
import start from './plugins/start.js'


export default getStore => {
  traverseModules(getStore(), store => {
    store.topModule._plugins = createPlugins(store, store.topModule.plugins)
  })

  return async (ev, meta) => {
    const e = sliceEventByModulePath(ev)
    const store = sliceStoreByModulePath(getStore(), e.modulePath, true)
    
    const { _plugins } = store.topModule

    e.meta = { ...e.meta, ...meta }
  
    if (store.history.state.pop) {
      e.meta.pop = store.history.state.pop
    }

    try {
      await dispatchPlugins([start, ..._plugins], store, e)
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
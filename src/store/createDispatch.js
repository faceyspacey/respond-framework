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
  
    try {
      await dispatchPlugins([start, ..._plugins], store, e)
    }
    catch (error) {
      await store.onError(error, 'dispatch', e)
    }
  }
}



const dispatchPlugins = (plugins, store, e) => {
  return next(0)

  async function next(i) {
    const plugin = plugins[i]
    if (!plugin) return

    const res = await plugin(store, e)
    if (res === false) return

    e = res ? { ...e, ...res } : e

    await next(i + 1)
  }
}
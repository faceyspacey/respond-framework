
import { sliceStoreByModulePath, sliceEventByModulePath } from '../utils/sliceByModulePath.js'
import traverseModules from '../utils/traverseModules.js'
import createPlugins from './createPlugins.js'


export default getStore => {
  const { defaultPluginsSync } = getStore().options

  traverseModules(getStore(), store => {
    store.topModule._pluginsSync = createPlugins(store, store.topModule.pluginsSync || defaultPluginsSync)
  })

  return (ev, meta) => {
    const e = sliceEventByModulePath(ev)
    const store = sliceStoreByModulePath(getStore(), e.modulePath, true)
    
    const { _pluginsSync } = store.topModule

    e.meta = { ...e.meta, ...meta }
  
    try {
      return dispatchPlugins([start, ..._pluginsSync], store, e)
    }
    catch (error) {
      store.onError({ error, kind: 'dispatch', e })
    }
  }
}



const dispatchPlugins = (plugins, store, e) => {
  const last = plugins.length - 1
  return next(0)

  function next(i) {
    const plugin = plugins[i]

    if (i === last) {
      return Promise.resolve(plugin(store, e, true))
        .then(res => res !== false && e.event.end?.(store, { ...e, ...res })) // last plugin can be async, since it runs after reduction
        .catch(error => store.onError({ error, kind: 'dispatch', e }))
    }

    const res = plugin(store, e, true)
    if (res === false) return

    e = res ? { ...e, ...res } : e

    return next(i + 1)
  }
}


const start = (store, e) => {
  if (!e.meta.trigger) return
  store.replays.sendTrigger(store, e)
  if (e.meta.skipped) return false
}
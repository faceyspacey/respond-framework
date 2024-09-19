
import sliceByModulePath, { sliceEventByModulePath, traverseModules } from '../utils/sliceByModulePath.js'
import createPlugins from './createPlugins.js'


export default getStore => {
  return (ev, meta) => {
    if (!getStore()._plugins) {
      const top = getStore()

      traverseModules(top, store => {
        store._pluginsSync = createPlugins(store, top.options.defaultPluginsSync, store.pluginsSync)
      })
    }

    const e = sliceEventByModulePath(ev)
    const store = sliceByModulePath(getStore(), e.modulePath)
    
    const { _pluginsSync } = store

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
import { sliceEventByModulePath } from '../../utils/sliceByModulePath.js'
import dispatchPluginsAsync from '../../utils/dispatchPlugins.js'

export default async function(ev, meta) {
  const e = sliceEventByModulePath(ev)
  const store = this.respond.modulePaths[e.modulePath]
    
  e.meta = { ...e.meta, ...meta }

  try {
    return dispatchPlugins([start, ...store.pluginsSync], store, e)
  }
  catch (error) {
    store.onError({ error, kind: 'dispatch', e })
  }
}



const dispatchPlugins = (plugins, store, e) => {
  return next(0)

  function next(i) {
    const plugin = plugins[i]

    const res = plugin(store, e)

    if (res instanceof Promise) {
      return Promise.resolve(res) // plugins are allowed to be async after sync reduction
        .then(res => {
          const asyncPlugins = plugins.slice(i + 1)
          e = res ? { ...e, ...res } : e
          dispatchPluginsAsync(asyncPlugins, store, e)
        })
    }

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

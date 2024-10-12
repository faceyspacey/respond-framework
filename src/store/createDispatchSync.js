import { sliceEventByModulePath } from '../utils/sliceByModulePath.js'


export default async function(ev, meta) {
  const e = sliceEventByModulePath(ev)
  const store = this.modulePaths[e.modulePath]
    
  e.meta = { ...e.meta, ...meta }

  try {
    return dispatchPlugins([start, ...store._pluginsSync], store, e)
  }
  catch (error) {
    store.onError({ error, kind: 'dispatch', e })
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
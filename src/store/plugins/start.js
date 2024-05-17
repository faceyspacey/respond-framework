import traverseModules from '../../utils/traverseModules.js'


export default async (store, e) => {
  if (store.ctx.init && !e.meta.skipped) {
    applyInitProperties(store, e)

    const res = await loadPlugins(store, e)
    if (res.includes(false)) return false
  }

  if (e.event.path && store.cache.has(e)) {
    e.cached = true
  }

  if (!e.meta.trigger) return
  store.replays.sendTrigger(store, e)

  if (e.meta.skipped) return false
}



const applyInitProperties = (store, e) => {
  store.ctx.init = false
  e.init = true
  e.meta.trigger = true
}


const loadPlugins = async (store, e) => {
  const promises = []

  traverseModules(store.getStore(), store => {
    store.topModule._plugins.forEach(p => {
      if (!p.load) return

      const promise = p.load(store, e)
      promises.push(promise)
    })
  })

  return Promise.all(promises)
}
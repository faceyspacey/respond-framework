import traverseModules from '../../utils/traverseModules.js'


export default (store, e) => {
  let promises

  if (store.ctx.init && !e.meta.skipped) {
    applyInitProperties(store, e)
    promises = loadPlugins(store, e)
  }

  if (e.event.path && store.cache?.has(e)) {
    e.cached = true
  }

  if (!e.meta.trigger) return
  store.replays.sendTrigger(store, e)

  if (e.meta.skipped) return false

  return promises // await plugins.load
}


const applyInitProperties = (store, e) => {
  store.ctx.init = false
  e.init = true
  e.meta.trigger = true
}


const loadPlugins = async (store, e) => {
  let promises = []

  traverseModules(store.getStore(), store => {
    store.topModule._plugins.forEach(p => {
      if (!p.load) return

      const promise = p.load(store, e)
      promises.push(promise)
    })
  })

  const res = await Promise.all(promises)
  if (res.includes(false)) return false
}
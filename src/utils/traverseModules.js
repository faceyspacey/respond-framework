export default function traverseModules(store, callback) {
  callback(store)

  const children = store.topModule.modules

  for (const k in children) {
    const childStore = sliceChildStore(store, k)
    traverseModules(childStore, callback)
  }
}



const sliceChildStore = (store, k) => {
  const events = store.events[k]
  const state = store.state[k]
  const topModule = store.topModule.modules[k]
  const { modulePath } = topModule

  return { ...store, events, state, topModule, modulePath }
}
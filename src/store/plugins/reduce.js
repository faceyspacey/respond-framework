import wrapInActForTests from '../../utils/wrapInActForTests.js'
import { prependModulePathToE } from '../../utils/sliceByModulePath.js'


export default wrapInActForTests((storeSlice, eSlice, sync) => {
  if (eSlice.event.reduce === false) return
  
  const store = storeSlice.getStore()
  const e = prependModulePathToE(eSlice)

  const start = e.event === store.events.start

  try {
    if (start) {
      reduceAllModules(e, store)
    }
    else {
      reduceBranch(e, store, e.modulePath.split('.'))
    }
  }
  catch (error) {
    store.onError({ error, kind: 'reduce', e: eSlice })
  }

  delete store.ctx.modulePathReduced // workaround: events created in reducers will have their type/namespace sliced for the given module (see below + createEvents.js)
  
  if (eSlice.init && eSlice.kind === 'navigation') {
    delete store.ctx.init // while false or true, tag the first navigation event with .init, even if after redirects, see createEvents.js
  }

  store.devtools?.send(eSlice) // devtools not available on initial reduction in createState.js

  if (!sync && !start) return store.notify(e) // awaited in tests/replays
})


const reduceAllModules = (e, store) => {
  reduceModule(store, e, store, store.reducers)
  store.moduleKeys.forEach(k => reduceAllModules(e, store[k]))
}


const reduceBranch = (e, store, remainingPaths) => {
  const k = remainingPaths.shift()
  const p = remainingPaths.join('.') // make reducers unaware of their module by removing its segment from path

  reduceModule(store, e, store, store.reducers, store[k]?.ignoreChild)

  if (!k) return

  const namespace = p ? (e._namespace ? `${p}.${e._namespace}` : p) : e._namespace
  const type = namespace ? `${namespace}.${e._type}` : e._type

  reduceBranch({ ...e, type, namespace }, store[k], remainingPaths)
}



const reduceModule = (state, e, store, reducers, ignore) => {
  if (ignore) return

  store.ctx.modulePathReduced = store.modulePath
  
  for (const k in reducers) {
    const reduce = reducers[k]

    if (store.overridenReducers.get(reduce)) {
      continue
    }
    else if (typeof reduce === 'object') {
      if (!state[k]) state[k] = {}
      reduceModule(state[k], e, store, reduce)
    }
    else {
      state[k] = reduce(state[k], e, store, state)
    }
  }
}
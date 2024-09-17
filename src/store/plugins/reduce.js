import { prependModulePathToE } from '../../utils/sliceByModulePath.js'
import wrapInActForTests from '../../utils/wrapInActForTests.js'


export default wrapInActForTests((storeSlice, eSlice, sync, initialReduction) => {
  if (eSlice.event.reduce === false) return
  
  const store = storeSlice.getStore()
  const e = prependModulePathToE(eSlice)

  try {
    if (e.event === store.events.init) {
      reduceAllBranches(store.state, e, store, store.topModule)
    }
    else {
      const remainingPaths = e.modulePath.split('.')
      reduceBranch(store.state, e, store, store.topModule, remainingPaths)
    }
  }
  catch (error) {
    store.onError({ error, kind: 'reduce', e: eSlice })
  }

  delete store.ctx.modulePathReduced // workaround: events created in reducers will have their type/namespace sliced for the given module (see below + createEvents.js)
  
  if (eSlice.init && eSlice.kind === 'navigation') {
    delete store.ctx.init // while false or true, tag the first navigation event with .init, even if after redirects, see createEvents.js
  }

  if (!initialReduction) { // ignored on initial reduction in createStore.js
    store.devtools.send(eSlice)
  }

  if (!sync) {
    return store.notify(e) // await in tests/replays
  }
})




const reduceAllBranches = (st, e, store, mod, path = []) => {
  const { reducers, state, events, selectors } = store

  for (const k in reducers) {
    const reduce = reducers[k]
    
    if (typeof reduce === 'object') {
      const childMod = mod?.modules?.[k] // could be child module or reducer "group" within current module

      if (st[k] === undefined) {
        st[k] = {} // create empty object for module/group to be reduced in next call
      }

      const childStoreMaybe =  {
        ...store,
        reducers: reduce,
        state: childMod ? state[k] : state,
        events: childMod ? state[k].events : events,
        // selectors: childMod ? selectors[k] : selectors,
      }
  
      const childPath = childMod ? [...path, k] : path

      reduceAllBranches(st[k], e, childStoreMaybe, childMod, childPath)
    }
    else {
      store.ctx.modulePathReduced = path

      if (reduce.__prop) {
        const moduleName = reduce.__prop
        st[moduleName][k] = reduce(st[moduleName][k], e, store, st) // reduce in context of parent, but attach to child module's state
      }
      else {
        st[k] = reduce(st[k], e, store, st)
      }
    }
  }

  if (process.env.NODE_ENV === 'development' && store.options.displaySelectorsInDevtools) {
    reduceSelectors(st, store, mod)
  }
}





const reduceBranch = (st, e, store, mod, remainingPaths, path = []) => {
  const k = remainingPaths[0]

  const childMod = mod?.modules?.[k]

  if (!childMod?.ignoreChild) { // used to ignore replayTools
    reduceLimb(st, e, store, mod, path)
  }

  if (!k) return

  const { state, events, reducers, selectors } = store

  const childStoreMaybe = {
    ...store,
    state: state[k],
    events: state[k].events,
    reducers: reducers[k],
    // selectors: selectors[k]
  }

  remainingPaths = remainingPaths.slice(1)
  const modulePath = remainingPaths.join('.') // make reducers unaware of their module by removing its segment from path
  
  const namespace = modulePath
    ? e._namespace ? `${modulePath}.${e._namespace}` : modulePath
    : e._namespace

  const type = namespace ? `${namespace}.${e._type}` : e._type

  e = { ...e, type, namespace }

  const childPath = childMod ? [...path, k] : path

  reduceBranch(childStoreMaybe.state, e, childStoreMaybe, childMod, remainingPaths, childPath)
}



const reduceLimb = (st, e, store, mod, path) => {
  const { reducers } = store

  for (const k in reducers) {
    const reduce = reducers[k]

    if (typeof reduce === 'object') {
      const childMod = mod?.modules?.[k]

      if (!childMod) { // reducer namespace object within current module
        const nestedStore = { ...store, reducers: reduce }
        reduceLimb(st[k], e, nestedStore, undefined, path)
      }
    }
    else {
      store.ctx.modulePathReduced = path

      if (reduce.__prop) {
        const moduleName = reduce.__prop
        st[moduleName][k] = reduce(st[moduleName][k], e, store, st) // reduce in context of parent, but attach to child module's state
      }
      else {
        st[k] = reduce(st[k], e, store, st)
      }
    }
  }

  if (process.env.NODE_ENV === 'development' && store.options.displaySelectorsInDevtools) {
    reduceSelectors(st, store, mod)
  }
}



const reduceSelectors = (st, store, mod) => {
  if (!mod) return
  const { selectors } = store

  st['(selectors)'] = {}

  for (const k in selectors) {
    const selector = selectors[k]

    if (typeof selector !== 'function') continue
    if (selector.length > 1) continue

    try {
      const nextState = selector(st)

      if (nextState !== undefined) {
        st['(selectors)'][k] = nextState
      }
    }
    catch (e) {} 
  }
}
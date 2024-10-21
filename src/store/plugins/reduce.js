import wrapInActForTests from '../../utils/wrapInActForTests.js'
import { prependModulePathToE } from '../../utils/sliceByModulePath.js'


export default wrapInActForTests((state, e) => {
  if (e.event.reduce === false) return
  
  const { respond } = state
  const { kinds, ctx, devtools, modulePath } = respond

  const top = respond.getStore()
  const eTop = prependModulePathToE(e)

  try {
    if (e.event === top.events.start) {
      reduceAllModules(eTop, top)
    }
    else {
      reduceBranch(eTop, top, modulePath.split('.'))
    }
  }
  catch (error) {
    respond.onError({ error, kind: 'reduce', e })
  }

  delete ctx.modulePathReduced    // workaround: events created in reducers will have their type/namespace sliced for the given module (see below + createEvents.js)  
  if (e.kind === kinds.navigation) top.__navigated = true
  devtools.send(eTop)
  return respond.notify(eTop)
})


const reduceAllModules = (e, mod) => {
  reduceModule(mod, e, mod, mod.reducers)
  mod.moduleKeys.forEach(k => reduceAllModules(e, mod[k]))
}


// const reduceBranch = (e, mod, remainingPaths) => {
//   const k = remainingPaths.shift()
//   const p = remainingPaths.join('.') // make reducers unaware of their module by removing its segment from path
//   reduceModule(mod, e, mod, mod.reducers, mod[k]?.ignoreChild)

//   if (!k) return

//   const namespace = p ? (e._namespace ? `${p}.${e._namespace}` : p) : e._namespace
//   const type = namespace ? `${namespace}.${e._type}` : e._type
//   reduceBranch({ ...e, type, namespace }, mod[k], remainingPaths)
// }

const reduceBranch = (e, mod, remainingPaths) => {
  const k = remainingPaths.shift()
  const p = remainingPaths.join('.') // make reducers unaware of their module by removing its segment from path

  if (k) {
    const namespace = p ? (e._namespace ? `${p}.${e._namespace}` : p) : e._namespace
    const type = namespace ? `${namespace}.${e._type}` : e._type
    reduceBranch({ ...e, type, namespace }, mod[k], remainingPaths)
  }

  reduceModule(mod, e, mod, mod.reducers, mod[k]?.ignoreChild)
}


const reduceModule = (state, e, mod, reducers, ignore) => {
  if (ignore) return

  mod.ctx.modulePathReduced = mod.modulePath
  
  for (const k in reducers) {
    const reduce = reducers[k]

    if (mod.overridenReducers.get(reduce)) {
      continue
    }
    else if (typeof reduce === 'object') {
      if (!state[k]) state[k] = {}
      reduceModule(state[k], e, mod, reduce)
    }
    else {
      state[k] = reduce(state[k], e, mod, state) // 4th arg is reducer group
    }
  }
}
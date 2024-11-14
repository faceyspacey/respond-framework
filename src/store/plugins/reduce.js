import wrapInActForTests from '../../utils/wrapInActForTests.js'
import { prependModulePathToE } from '../../utils/sliceByModulePath.js'


export default wrapInActForTests((state, e) => {
  const { respond } = state
  const { ctx, branch } = respond

  const top = respond.getStore()
  const eTop = prependModulePathToE(e)

  try {
    if (e.event.reduce === false) {
      
    }
    else if (e.event.reduce) {
      e.event.reduce.call(state, state, e)
    }
    else if (e.event === top.events.init) {
      reduceAllModules(eTop, top)
    }
    else {
      reduceBranch(eTop, top, branch.split('.'))
    }

    e.event.afterReduce?.call(state, state, e)
  }
  catch (error) {
    respond.onError({ error, kind: 'reduce', e })
  }

  delete ctx.modulePathReduced    // workaround: events created in reducers will have their type/namespace sliced for the given module (see below + createEvents.js)  
  
  return respond.notify(eTop)
})


const reduceAllModules = (e, mod) => {
  reduceModule(mod, e, mod, mod.reducers)
  mod.moduleKeys.forEach(k => reduceAllModules(e, mod[k]))
}



const reduceModule = (state, e, mod, reducers) => {
  mod.ctx.modulePathReduced = mod.branch
  
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
      const next = reduce.call(mod, state[k], e, mod, state) // 4th arg is reducer group
      if (next !== undefined) state[k] = next
    }
  }
}





const reduceBranch = (e, mod, [...remainingBranches]) => {
  const k = remainingBranches.shift()
  const p = remainingBranches.join('.') // make reducers unaware of their module by removing its segment from branch

  let ignore = k && mod[k].ignoreParents
  let reduced

  function next() {
    if (!k) return

    const namespace = p ? (e._namespace ? `${p}.${e._namespace}` : p) : e._namespace
    const type = namespace ? `${namespace}.${e._type}` : e._type

    const ignoreParents = reduceBranch({ ...e, type, namespace }, mod[k], remainingBranches)
    ignore ??= ignoreParents // ignore recursively back up the depth-first tree
  }

  function reduce(override) {
    if (ignore && !override) return // ignore only applies to entire tree when depth-first (which is default), otherwise if mod.reduce switches to breadth-first by calling reduce before next, you only get one level ignoring; and optionally parents in mod.reduce can `override` ignoreParents
    reduceModule(mod, e, mod, mod.reducers)
    reduced = true
  }

  if (mod.reduce) {
    const should = mod.reduce(mod, e, next, reduce)
    const shouldReduce = should !== false && !reduced
    if (shouldReduce) reduce() // allow reducing by default, and only having to think about `next` (depth-first maintained as default) -- but since we want this default AND the ability to prevent reducing the current module, we introduce returning `false` to facilitate all scenarios
  }
  else {
    next()
    if (!ignore) reduce()
  }

  return ignore
}





// here for reference in understanding the above reduceBranch function


// const reduceBranchBreadthFirst = (e, mod, remainingBranches) => {
//   const k = remainingBranches.shift()
//   const p = remainingBranches.join('.') // make reducers unaware of their module by removing its segment from path
//   reduceModule(mod, e, mod, mod.reducers, mod[k]?.ignoreParents)

//   if (!k) return

//   const namespace = p ? (e._namespace ? `${p}.${e._namespace}` : p) : e._namespace
//   const type = namespace ? `${namespace}.${e._type}` : e._type
//   reduceBranch({ ...e, type, namespace }, mod[k], remainingBranches)
// }



// const reduceBranchDepthFirst = (e, mod, remainingBranches) => {
//   const k = remainingBranches.shift()
//   const p = remainingBranches.join('.') // make reducers unaware of their module by removing its segment from path

//   if (k) {
//     const namespace = p ? (e._namespace ? `${p}.${e._namespace}` : p) : e._namespace
//     const type = namespace ? `${namespace}.${e._type}` : e._type

//     const ignoreParents = reduceBranch({ ...e, type, namespace }, mod[k], remainingBranches)
//     if (ignoreParents || mod[k].ignoreParents) return true
//   }

//   reduceModule(mod, e, mod, mod.reducers)
// }
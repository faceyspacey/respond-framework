import wrapInActForTests from '../../utils/wrapInActForTests.js'


export default wrapInActForTests((state, e) => {
  const { respond } = state
  const top = respond.getStore()

  try {
    e.event.beforeReduce?.call(state, state, e)

    if (e.event.reduce === false) {
      
    }
    else if (e.event.reduce) {
      e.event.reduce.call(state, state, e)
    }
    else if (e.event === top.events.init) {
      reduceTree(e, top)
    }
    else {
      reduceBranch(e, top, respond.branch.split('.'))
    }

    e.event.afterReduce?.call(state, state, e)
  }
  catch (error) {
    respond.onError({ error, kind: 'reduce', e })
  }

  return respond.notify(e)
})



const reduceTree = (e, mod, prevState = {}) => {
  const proto = Object.getPrototypeOf(mod)
  proto.prevState = prevState

  let nexted
  let reduced

  function next() {
    nexted = true
    mod.moduleKeys.forEach(k => reduceTree(e, mod[k], prevState[k] = {}))
  }

  function reduce() {
    reduced = true
    reduceModule(mod, e, mod, mod.reducers, true)
  }

  if (mod.reduce) {
    mod.reduce(mod, e, next, reduce)
  }
  
  if (!nexted) next() // default is depth-first
  if (!reduced) reduce()
}





const reduceModule = (state, e, mod, reducers, init) => {
  for (const k in reducers) {
    const reduce = reducers[k]

    if (mod.respond.overridenReducers.get(reduce)) {
      continue
    }
    else if (typeof reduce === 'object') {
      reduceModule(state[k] ??= {}, e, mod, reduce)
    }
    else {
      const prev = init && state[k] && !state.hasOwnProperty(k) ? undefined : state[k] // clashing name on proto on init : prevState as normal in subsequence reductions
      const next = reduce.call(mod, prev, e, mod, state) // 4th arg is reducer group
      if (next !== undefined) state[k] = next
    }
  }
}




const reduceBranch = (e, mod, [...remainingBranches]) => {
  const k = remainingBranches.shift()

  let ignore = k && mod[k].ignoreParents
  let reduced

  function next() {
    if (!k) return
    const ignoreParents = reduceBranch(e, mod[k], remainingBranches)
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
    next() // default is depth-first
    if (!ignore) reduce()
  }

  return ignore
}





// here for reference in understanding the above reduceBranch function


// const reduceBranchBreadthFirst = (e, mod, remainingBranches) => {
//   const k = remainingBranches.shift()
//   reduceModule(mod, e, mod, mod.reducers, mod[k]?.ignoreParents)

//   if (!k) return

//   reduceBranch(e, mod[k], remainingBranches)
// }



// const reduceBranchDepthFirst = (e, mod, remainingBranches) => {
//   const k = remainingBranches.shift()

//   if (k) {

//     const ignoreParents = reduceBranch(e, mod[k], remainingBranches)
//     if (ignoreParents || mod[k].ignoreParents) return true
//   }

//   reduceModule(mod, e, mod, mod.reducers)
// }
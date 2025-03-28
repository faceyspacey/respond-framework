export default (state, e) => {
  const { respond } = state
  const { topState } = respond

  let ret

  try {
    ret = e.event.reduceBefore?.call(state, state, e)

    if (ret !== false) {
      if (e.event.reduce === false) {
        // skip reduction
      }
      else if (e.event.reduce) {
        ret = e.event.reduce.call(state, state, e)
      }
      else if (e.event === topState.events.init) {
        reduceEntireTree(e, topState)
      }
      else {
        reduceBranch(e, topState, respond.branch.split('.'))
      }
    }

    ret ??= e.event.reduceAfter?.call(state, state, e)
  }
  catch (error) {
    respond.onError({ error, kind: 'reduce', e })
  }

  respond.notify(e)
  return ret
}



const reduceEntireTree = (e, mod, prevState = {}) => {
  const proto = Object.getPrototypeOf(mod)
  proto.prevState = prevState

  let reduced

  function next() {
    mod.moduleKeys.forEach(k => reduceEntireTree(e, mod[k], prevState[k] = {}))
  }

  function reduce() {
    reduceModuleInit(mod, e, mod, mod.reducers)
    reduced = true
  }

  if (mod.reduce) {
    const should = mod.reduce(mod, e, next, reduce)
    const shouldReduce = should !== false && !reduced
    if (shouldReduce) reduce() // allow reducing by default, and only having to think about `next` (depth-first maintained as default) -- but since we want this default AND the ability to prevent reducing the current module, we introduce returning `false` to facilitate all scenarios
  }
  else {
    next() // default is depth-first
    reduce()
  }
}




const reduceBranch = (e, mod, [...remainingBranches]) => {
  const k = remainingBranches.shift()

  let ignore = k && mod[k].respond.ignoreParents
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




const reduceModule = (state, e, mod, reducers) => {
  for (const k in reducers) {
    const reduce = reducers[k]

    if (mod.respond.overriden.get(reduce)) {
      continue
    }
    else if (typeof reduce === 'object') {
      reduceModule(state[k], e, mod, reduce)
    }
    else {
      const next = reduce.call(mod, state[k], e, mod, state) // 4th arg is reducer group
      if (next !== undefined) state[k] = next
    }
  }
}




const reduceModuleInit = (state, e, mod, reducers) => {
  for (const k in reducers) {
    const reduce = reducers[k]

    if (!reduce) {
      delete reducers[k]
      continue // assigned null to a built-in reducer to disable it
    }

    if (mod.respond.overriden.get(reduce)) {
      continue
    }
    else if (typeof reduce === 'object') {
      state[k] ??= {}
      reduceModule(state[k], e, mod, reduce)
    }
    else {
      const prev = !state.hasOwnProperty(k) ? undefined : state[k] // potential clashing name on proto : prevState as normal
      const next = reduce.call(mod, prev, e, mod, state) // 4th arg is reducer group
      if (next !== undefined) state[k] = next
    }
  }
}
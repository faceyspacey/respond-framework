// order state in the clearest way to see what's going on in devtools


const orderState = (state, store, mod, isSelectors) => {
  const modules = {}
  const selectors = {}
  const booleans = {}
  const numbers = {}
  const strings = {}
  const arrays = {}
  const objects = {}
  const dates = {}
  const everythingElse = {}

  Object.keys(state).forEach(k => {
    const v = state[k]

    const childMod = mod?.moduleKeys?.includes(k) && mod[k]
    
    if (k === 'replayTools' && !store.replays.options.log) return
    
    k = childMod
      ? k + ' (module)'
      : isSelectors ? k + ' (selector)' : k

    if (childMod) {
      modules[k] = orderState(v, store, childMod)
    }
    else if (k === '(selectors)') {
      if (store.options.groupSelectorsInDevtools) {
        selectors['(selectors)'] = orderState(v, store)
      }
      else {
        Object.assign(selectors, orderState(v, store, undefined, true))
      }
    }
    else if (typeof v === 'boolean') {
      booleans[k] = v
    }
    else if (typeof v === 'number') {
      numbers[k] = v
    }
    else if (typeof v === 'string') {
      strings[k] = v
    }
    else if (Array.isArray(v)) {
      arrays[k] = v
    }
    else if (v instanceof Date) {
      dates[k] = v
    }
    else if (v && typeof v === 'object') {
      objects[k] = orderState(v, store)
    }
    else {
      everythingElse[k] = v
    }
  })

  return {
    ...modules,
    ...selectors,
    ...booleans,
    ...numbers,
    ...strings,
    ...arrays,
    ...objects,
    ...dates,
    ...everythingElse,
  }
}


export default orderState
import { canProxy } from '../proxy/helpers/utils.js'

// this is for deep merge in reducers (model arrays containing matching ids are deep merged)

export default function mergeDeep(target, source = {}) {
  Object.keys(source).forEach(k => {
    const v = source[k]

    if (Array.isArray(v)) {
      mergeModelArray(target, k, v)
    }
    else if (canProxy(v)) {
      if (!target[k]) target[k] = Object.create(Object.getPrototypeOf(v))
      mergeDeep(target[k], v)
    }
    else target[k] = v
  })

  return target
}




const mergeModelArray = (target, k, v) => {
  const t = target[k]

  if (!t || t.length === 0 || !v[0]?.id) { // no target || empty target || not an array of models with IDs
    target[k] = v.slice() // note, for perf we aren't concerned about cloning deep in order to create new references, as mergeDeep is only used for fresh objects parsed from the network in addToCache.js within reducers, or elsewhere with the same assumption
  }
  else {
    v.forEach((el, i) => {
      const prev = t[i]

      const { id } = el
      const prevId = prev?.id

      const currEl = id === prevId
        ? prev
        : target[k].find(prev => prev.id === el.id) // models may not be in the same order, so we try to match em
      
      if (currEl) {
        mergeDeep(currEl, el)
      }
      else {
        target[k].push(el)
      }
    })
  }
}
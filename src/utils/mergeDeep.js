// this is for deep merge in reducers
// if arrays are involved, only model arrays containing ids can currently be deep merged properly

export default function mergeDeep(target, source = {}) {
  for (const k in source) {
    const v = source[k]

    if (Array.isArray(v)) {
      mergeModelArray(target, k, v)
    }
    else if (isObj(v)) {
      if (!target[k]) target[k] = {}
      mergeDeep(target[k], v)
    }
    else target[k] = v
  }

  return target
}




const isObj = v =>
  v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)


const mergeModelArray = (target, k, v) => {
  if (!target[k] || target[k].length === 0) {
    target[k] = v.slice() // note, for perf we aren't concerned about cloning deep in order to create new references, but probably should
  }
  else {
    // try to merge models in arrays

    if (!v[0]?.id) { // if not an array of models with IDs, don't try to match em 
      target[k] = v.slice()
    }
    else {
      v.forEach(el => {
        const currEl = target[k].find(({ id }) => id === el.id) // models may not be in the same order, so we try to match em
        
        if (currEl) {
          mergeDeep(currEl, el)
        }
        else {
          target[k].push(el)
        }
      })
    }
  }
}
import sliceByModulePath, { recreateFullType } from './sliceByModulePath.js'


const symbol = Symbol.for('respondEvent')


export const replacer = (k, v) => {
  if (typeof v === 'function' && v._symbol === symbol) {
    return {
      __event: true,
      type: recreateFullType(v),
    }
  }

  return v
}



export const createReviver = events => {
  if (!events) {
    return (k, v) => (/At$/.test(k) && typeof v !== 'object' && v)
      ? new Date(v)
      : v
  }

  return (k, v) => {
    if (typeof v === 'object' && v?.__event && v.type) {
      return sliceByModulePath(events, v.type)
    }
    
    return (/At$/.test(k) && typeof v !== 'object' && v)
      ? new Date(v)
      : v
  }
}



  
export const reviveObject = (events, obj) => {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(v => reviveObject(events, v))
  
  return Object.keys(obj).reduce((acc, k) => {
    const v = obj[k]

    if (typeof v === 'object' && v && v.__event && v.type) {
      acc[k] = sliceByModulePath(events, v.type)
    }
    else {
      acc[k] = reviveObject(events, v)
    }

    return acc
  }, {})
}



export const reviveEventFunctionReferences = (events, obj) => {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(v => reviveEventFunctionReferences(events, v))

  return Object.keys(obj).reduce((acc, k) => {
    const v = obj[k]

    if (typeof v === 'function' && v._symbol === symbol) {
      acc[k] = sliceByModulePath(events, v.type) // a new store was created in replays/hmr, so we capture the same event function but the new reference in the new store
    }
    else {
      acc[k] = reviveEventFunctionReferences(events, v)
    }

    return acc
  }, {})
}
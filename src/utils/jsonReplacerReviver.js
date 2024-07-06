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


const dateKeyReg = /At$/


export const createReviver = events => {
  if (!events) {
    return (k, v) => (dateKeyReg.test(k) && typeof v !== 'object' && v)
      ? new Date(v)
      : v
  }

  return (k, v) => {
    if (typeof v === 'object' && v?.__event && v.type) {
      return sliceByModulePath(events, v.type)
    }
    
    return (dateKeyReg.test(k) && typeof v !== 'object' && v)
      ? new Date(v)
      : v
  }
}


export const createReviverWithModels = models => {
  if (!models) return createReviver()
    
  return (k, v) => (dateKeyReg.test(k) && typeof v !== 'object' && v)
      ? new Date(v)
      : v?.__type
        ? new models[v.__type](v)
        : v
}


export const reviveDates = (v, k) => {
  if (k && /At$/.test(k) && typeof v !== 'object' && v) {
    return new Date(v)
  }

  if (!v || typeof v !== 'object') return v

  if (Array.isArray(v)) return v.map(v2 => reviveDates(v2))
  
  return Object.keys(v).reduce((acc, k) => {
    acc[k] = reviveDates(v[k], k)
    return acc
  }, {})
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
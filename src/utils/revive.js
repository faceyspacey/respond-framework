import { canProxy } from '../proxy/utils/helpers.js'


export default ({ eventsByType = {}, modelsByModulePath = {} } = {}, modulePath = '') => function rev(v, k) {
  if (dateKeyReg.test(k)) return v ? new Date(v) : v
  if (!canProxy(v))       return v
  if (v.__event)          return eventsByType[v.type] ?? v

  let snap

  if (v.__type) {
    const p = v.__modulePath ?? modulePath
    const Model = modelsByModulePath[p]?.[v.__type] ?? modelsByModulePath['']?.[v.__type]

    snap = {}
    keys(v).forEach(k => snap[k] = rev(v[k], k))

    snap = Model ? new Model(snap, p) : snap
  }
  else {
    snap = isArray(v) ? [] : create(getProto(v))
    keys(v).forEach(k => snap[k] = rev(v[k], k))
  }

  return snap
}





export const createReviver = (state = {}, modulePath) => {
  const isApiResponse = modulePath !== undefined
  return isApiResponse ? createApiReviver(state, modulePath) : createStateReviver(state) 
}


export const createStateReviver = ({ modelsByModulePath = {}, eventsByType = {} } = {}) => (k, v) => {
  if (dateKeyReg.test(k)) {
    return v ? new Date(v) : v
  }

  if (v?.__event) {
    return eventsByType[v.type] ?? v
  }

  if (v?.__type) {
    const p = v.__modulePath ?? ''
    const Model = modelsByModulePath[p]?.[v.__type] ?? modelsByModulePath['']?.[v.__type]
    if (!Model) return v
    return new Model(v, p)
  }

  return v
}






export const createApiReviver = ({ modelsByModulePath = {}, eventsByType = {} } = {}, modulePath = '') => (k, v) => {
  if (dateKeyReg.test(k)) return v ? new Date(v) : v
  if (v?.__event) return eventsByType[v.type] ?? v
  
  if (v?.__type) {
    const p = v.__modulePath ?? modulePath // usually __modulePath won't exist when coming from an API response, and the whole purpose of this reviver is for module-specified db to assign the modulePath via its argument to the outer function, but it's possible that a model (from a different module) passed from the client to the server can be returned from the server, in which case we preserve its __modulePath
    const Model = modelsByModulePath[p][v.__type] ?? modelsByModulePath['']?.[v.__type] // fallback to models from top module in case models not supplied in child module 
    if (!Model) return v
    return new Model(v, p)
  }

  return v
}





export const createServerReviver = state => {
  if (!state) {
    return (k, v) => {
      if (dateKeyReg.test(k)) {
        return v ? new Date(v) : v
      }

      return v
    }
  }

  if (state.modelsByModulePath) return createStateReviver(state)
  
  const db = state

  return (k, v) => {
    if (dateKeyReg.test(k)) {
      return v ? new Date(v) : v
    }
  
    if (v?.__event) {
      return eventsByType[v.type] ?? v
    }
  
    if (v?.__type) {
      const p = v.__modulePath ?? ''
      const Model = db[v.__type]?.Model
      if (!Model) return v
      return new Model(v, p)
    }
  
    return v
  }
}





export const replacer = (k, v) =>
  typeof v === 'function' && v.__event ? { __event: true, type: v.type } : v



const isArray = Array.isArray
const keys = Object.keys
const getProto = Object.getPrototypeOf
const create = Object.create

const dateKeyReg = /At$/
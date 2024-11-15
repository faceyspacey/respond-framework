import { canProxy } from '../proxy/utils/helpers.js'


export default ({ eventsByType = {}, modelsByBranch = {} } = {}, branch = '', refs = {}) => function rev(v, k) {
  if (dateKeyReg.test(k))   return v ? new Date(v) : v
  if (!canProxy(v))         return v
  if (v.__event)            return eventsByType[v.type] ?? v
  if (v.__refId)            return refs[v.__refId] ??= v

  let snap

  if (v.__type) {
    const b = v.__branch ?? branch
    const Model = modelsByBranch[b]?.[v.__type] ?? modelsByBranch['']?.[v.__type]

    snap = {}
    keys(v).forEach(k => snap[k] = rev(v[k], k))

    snap = Model ? new Model(snap, b) : snap
  }
  else {
    snap = isArray(v) ? [] : create(getProto(v))
    keys(v).forEach(k => snap[k] = rev(v[k], k))
  }

  return snap
}





export const createReviver = (state = {}, branch) => {
  const isApiResponse = branch !== undefined
  return isApiResponse ? createApiReviver(state, branch) : createStateReviver(state) 
}


export const createStateReviver = ({ modelsByBranch = {}, eventsByType = {} } = {}, refs = {}) => (k, v) => {
  if (dateKeyReg.test(k))  return v ? new Date(v) : v
  if (!canProxy(v))        return v
  if (v.__event)           return eventsByType[v.type] ?? v
  if (v.__refId)           return refs[v.__refId] ??= v

  if (v.__type) {
    const b = v.__branch ?? ''
    const Model = modelsByBranch[b]?.[v.__type] ?? modelsByBranch['']?.[v.__type]
    if (!Model) return v
    return new Model(v, b)
  }

  return v
}






export const createApiReviver = ({ modelsByBranch = {}, eventsByType = {} } = {}, branch = '', refs = {}) => (k, v) => {
  if (dateKeyReg.test(k))  return v ? new Date(v) : v
  if (!canProxy(v))        return v
  if (v.__event)           return eventsByType[v.type] ?? v
  if (v.__refId)           return refs[v.__refId] ??= v

  if (v.__type) {
    const b = v.__branch ?? branch // usually __branch won't exist when coming from an API response, and the whole purpose of this reviver is for module-specified db to assign the branch via its argument to the outer function, but it's possible that a model (from a different module) passed from the client to the server can be returned from the server, in which case we preserve its __branch
    const Model = modelsByBranch[b][v.__type] ?? modelsByBranch['']?.[v.__type] // fallback to models from top module in case models not supplied in child module 
    if (!Model) return v
    return new Model(v, b)
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

  if (state.modelsByBranch) return createStateReviver(state)
  
  const db = state

  return (k, v) => {
    if (dateKeyReg.test(k)) {
      return v ? new Date(v) : v
    }
  
    if (v?.__event) {
      return eventsByType[v.type] ?? v
    }
  
    if (v?.__type) {
      const b = v.__branch ?? ''
      const Model = db[v.__type]?.Model
      if (!Model) return v
      return new Model(v, b)
    }
  
    return v
  }
}





export const replacer = (k, v) => v // remember: make models use their id not __refId



const isArray = Array.isArray
const keys = Object.keys
const getProto = Object.getPrototypeOf
const create = Object.create

const dateKeyReg = /At$/
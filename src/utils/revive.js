import flattenDbTreeByBranchBy from '../db/utils/flattenDbTreeByBranchBy.js'
import { canProxy } from '../proxy/utils/helpers.js'


export default ({ modelsByBranch, eventsByType, branches } = {}, refs = {}) => function revive(v, k) {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)     return eventsByType[v.type] ?? v
  if (v.__refId)     return refs[v.__refId] ??= Object.defineProperty(v.__array ?? v, '__refId', { value: v.__refId, enumerable: false })

  let snap

  if (v.__type && v.__branch !== undefined) {
    const Model = modelsByBranch[v.__branch][v.__type]

    snap = {}
    keys(v).forEach(k => snap[k] = revive(v[k], k))

    snap = Model ? new Model(snap) : snap
  }
  else if (v.__module) {
    const mod = branches[v.__module]
    
    snap = create(getProto(mod))
    keys(v).forEach(k => snap[k] = revive(v[k], k))
  }
  else {
    snap = isArray(v) ? [] : create(getProto(v))
    keys(v).forEach(k => snap[k] = revive(v[k], k)) // breadth-first unlike json revivers below
  }

  return snap
}


export const createStateReviver = ({ modelsByBranch, eventsByType, branches }, refs = {}) => (k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)     return eventsByType[v.type] ?? v
  if (v.__refId)     return refs[v.__refId] ??= Object.defineProperty(v, '__refId', { value: v.__refId, enumerable: false })

  if (v.__type && v.__branch !== undefined) {
    const Model = modelsByBranch[v.__branch][v.__type] // models brought to the client will always have v.__branch tags by virture of createApiReviverForClient above
    return Model ? new Model(v) : v
  }
  else if (v.__module) {
    Object.setPrototypeOf(v, branches[v.__module])
  }

  return v
}



export const createApiReviverForClient = ({ models, eventsByType }, branch = '', refs = {}) => (k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)     return eventsByType[v.type] ?? v
  // if (v.__refId)     return refs[v.__refId] ??= v

  if (v.__type) {
    const Model = models[v.__type]
    return Model ? new Model(v, branch) : v // important: only clients care about tagging model's with v.__branch, as each db module only ever deals with one branch
  }

  return v
}



export const createApiReviverForServer = ({ modelsByBranch }, refs = {}) => (k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__refId)     return refs[v.__refId] ??= Object.defineProperty(v, '__refId', { value: v.__refId, enumerable: false })

  if (v.__type && v.__branch !== undefined) {
    const Model = modelsByBranch[v.__branch][v.__type] // models brought to the client will always have v.__branch tags by virture of createApiReviverForClient above
    return Model ? new Model(v) : v
  }

  return v
}



// in userland only createReviver will ever be used (and only on the server; it's almost identical to createApiReviverForServer, except it receives the entire tree/db, when itself then flattens)
export const createReviver = db => {
  const modelsByBranch = flattenDbTreeByBranchBy('models', db) // server receiving models from the client will also always have v.__branch tags by virture of createApiReviverForClient above and createStateReviver which preserves it
  return createApiReviverForServer({ modelsByBranch })
}



export const replacer = (k, v) =>
  v?.__refId
    ? Array.isArray(v)
      ? { __refId: v.__refId, __array: v.slice() }
      : { __refId: v.__refId, ...v }
    : v



const isArray = Array.isArray
const keys = Object.keys
const getProto = Object.getPrototypeOf
const create = Object.create

const dateKeyReg = /At$/
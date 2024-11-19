import { flattenModels } from '../db/utils/flattenDbTree.js'
import { canProxy } from '../proxy/utils/helpers.js'


export default ({ modelsByBranchType, eventsByType } = {}, refs = {}) => function revive(v, k) {
  if (!canProxy(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)      return eventsByType[v.type] ?? v

  if (isArray(v))     return v.__refId
    ? (refs[v.__refId] ??= Object.defineProperty(v.map(revive), '__refId', { value: v.__refId, enumerable: false }))
    : v.map(revive)
    
  if (v.__refId)      return refs[v.__refId] ??= Object.defineProperty(
    v.__array
      ? v.__array.map(revive)
      : keys(v).reduce((obj, k) => {
          obj[k] = revive(v[k], k)
          return obj
        }, modelsByBranchType[v.__branchType] ? new modelsByBranchType[v.__branchType] : {}),
    '__refId', { value: v.__refId, enumerable: false }
  )

  const obj = {}
  keys(v).forEach(k => obj[k] = revive(v[k], k))
  
  const Model = modelsByBranchType[v.__branchType]
  return Model ? new Model(obj) : obj
}




export const createStateReviver = ({ modelsByBranchType, eventsByType }, refs = {}) => (k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)     return eventsByType[v.type] ?? v
  if (v.__refId)      return refs[v.__refId] ??= Object.defineProperty(v.__array ? v.map(revive) : v, '__refId', { value: v.__refId, enumerable: false })
  if (isArray(v))     return v.map(revive)

  const Model = modelsByBranchType[v.__branchType]
  return Model ? new Model(v) : v
}



export const createApiReviverForClient = ({ models, eventsByType }, branch = '') => (k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)     return eventsByType[v.type] ?? v

  const Model = models[v.__type]
  return Model ? new Model(v, branch) : v // important: only clients care about tagging model's with v.__branch, as each db module only ever deals with one branch
}



const createApiReviverForServer = (modelsByBranchType, k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v

  const Model = modelsByBranchType[v.__branchType] // models brought to the client will always have v.__branch tags by virture of createApiReviverForClient above
  return Model ? new Model(v) : v
}



// in userland only createReviver will ever be used (and only on the server; it's almost identical to createApiReviverForServer, except it receives the entire tree/db, when itself then flattens)
export const createReviver = db => {
  let modelsByBranchType // models can't be flattened till execution time, as replayTools module is added to top module by createApi, which might run before OR after createReviver

  return (k, v) => {
    modelsByBranchType ??= flattenModels(db) // server receiving models from the client will also always have v.__branch tags by virture of createApiReviverForClient above and createStateReviver which preserves it
    return createApiReviverForServer(modelsByBranchType, k, v)
  }
}


// export const replacer = (k, v) => v

export const replacer = (k, v) =>
  v?.__refId && !v.__event
    ? Array.isArray(v)
      ? { __refId: v.__refId, __array: v.slice() }
      : { __refId: v.__refId, ...v }
    : v



const isArray = Array.isArray
const keys = Object.keys
const dateKeyReg = /At$/
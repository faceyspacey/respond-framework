import { flattenModels } from '../db/utils/flattenDbTree.js'
import { canProxy } from '../proxy/utils/helpers.js'


export default ({ modelsByBranchType, eventsByType } = {}, refs = {}) => function revive(v, k) {
  if (!canProxy(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)      return eventsByType[v.type] ?? v

  if (isArray(v))     return v.__refId
    ? (refs[v.__refId] ??= Object.defineProperty(v.map(revive), '__refId', { value: v.__refId, enumerable: false }))
    : v.map(revive)
    
  if (v.__refId)      return refs[v.__refId] ??= Object.defineProperty(
    v.__arr
      ? v.__arr.map(revive)
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
  if (!canProxy(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)      return eventsByType[v.type] ?? v

  const Mo = v.__branchType && modelsByBranchType[v.__branchType]
  const id = v.__refId

  if (id)             return refs[id] ??= define(Mo ? new Mo(v) : v.__arr ?? v, rid, { value: id, enumerable })

  return Mo ? new Mo(v) : v
}

const define = Object.defineProperty
const enumerable = false
const rid = '__refId'



export const createApiReviverForClient = ({ models, eventsByType }, branch = '') => (k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)     return eventsByType[v.type] ?? v

  const Model = models[v.__type]
  return Model ? new Model(v, branch) : v // important: only clients care about tagging model's with v.__branch, as each db module only ever deals with one branch
}



// in userland only createReviver will ever be used
export const createReviver = function createApiReviverForServer(db) {
  const { modelsByBranchType } = db 

  return (k, v) => {
    if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v

    const Model = modelsByBranchType[v.__branchType] // models brought to the client will always have v.__branchType tags by virture of createApiReviverForClient above
    return Model ? new Model(v) : v
  }
}


// export const replacer = (k, v) => v

export const replacer = (k, v) =>
  v?.__refId && !v.__event
    ? Array.isArray(v)
      ? { __refId: v.__refId, __arr: v.slice() }
      : { __refId: v.__refId, ...v }
    : v



const isArray = Array.isArray
const keys = Object.keys
const dateKeyReg = /At$/
import { flattenModels } from '../db/utils/flattenDbTree.js'
import { canProxy } from '../proxy/utils/helpers.js'
import { isServer } from './bools.js'
import { e } from '../store/createEvents.js'


export default ({ modelsByBranchType, eventsByType, refIds } = {}, refs = {}) => {
  const createObject = v => {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k], k))
    
    const Model = v.__branchType && modelsByBranchType[v.__branchType]
    return Model ? new Model(obj) : obj
  }

  function revive(v, k) {
    if (v?.__event)      return eventsByType[v.type] ?? v
    if (!canProxy(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
    // if (v.__e)          return Object.assign(Object.create(e.prototype), { ...v, event: eventsByType[v.type] })
  
    const id = v.__refId
  
    if (id) {
      if (refs[id]) return refs[id]
      const obj = v.__arr?.map(revive) ?? createObject(v)
      refIds.set(obj, id)
      delete obj.__refId
      return refs[id] = obj
    }
  
    return isArray(v) ? v.map(revive) : createObject(v)
  }

  return revive
}





export const createStateReviver = ({ modelsByBranchType, eventsByType, refIds }, refs = {}) => (k, v) => {
  if (!canProxy(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
  // if (v.__e)          return Object.assign(Object.create(e.prototype), v)
  if (v.__event)      return eventsByType[v.type] ?? v

  const id = v.__refId

  if (id) {
    if (refs[id]) return refs[id]
    const Model = v.__branchType && modelsByBranchType[v.__branchType]
    const obj = Model ? new Model(v) : v.__arr ?? v
    refIds.set(obj, id)
    delete obj.__refId
    return refs[id] = obj
  }

  const Model = v.__branchType && modelsByBranchType[v.__branchType]
  return Model ? new Model(v) : v
}





export const createApiReviverForClient = (respond, branch = '') => (k, v) => {
  if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v
  // if (v.__e)         return Object.assign(Object.create(e.prototype), v)
  if (v.__event)     return respond.eventsByType[v.type] ?? v

  const Model = respond.models[v.__type]
  return Model ? new Model(v, branch) : v // important: only clients care about tagging model's with v.__branch, as each db module only ever deals with one branch
}



// in userland only createReviver will ever be used
export const createReviver = function createApiReviverForServer(db) {
  db = isServer ? db : { modelsByBranchType: flattenModels(db) }
  let b = ''

  return (k, v) => {
    if (k === 'focusedBranch') {
      return b = v
    }

    if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v

    const Model = v.__branchType && db.modelsByBranchType[b ? `${b}.${v.__branchType}` : v.__branchType] // models brought to the client will always have v.__branchType tags by virture of createApiReviverForClient above
    return Model ? new Model(v) : v
  }
}




export const createReplacer = ({ refIds }) => (k, v) =>
  typeof v === 'object' && refIds.has(v) && !v.__event
    ? isArray(v)
      ? { __refId: refIds.get(v), __arr: v.slice() }
      : { __refId: refIds.get(v), ...v }
    : v


const isArray = Array.isArray
const keys = Object.keys
const dateKeyReg = /At$/
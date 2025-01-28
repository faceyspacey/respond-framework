import { canProxy, isObj } from '../../proxy/helpers/utils.js'
import { e } from '../createEvents.js'


export default ({ modelsByBranchType, eventsByType } = {}) => {
  const createObject = v => {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k], k))
    
    const Model = v.__branchType && modelsByBranchType[v.__branchType]
    return Model ? new Model(obj, false) : obj
  }

  function revive(v, k) {
    if (v?.__event)    return eventsByType[v.__event] ?? v
    if (v?.__e)        return Object.assign(Object.create(e.prototype), Object.keys(v).reduce((acc, k) => ({ ...acc, [k]: revive(v[k], k) }), {}))
    if (!canProxy(v))  return dateKeyReg.test(k) && v ? new Date(v) : v

                       return isArray(v) ? v.map(revive) : createObject(v)
  }

  return revive
}






export const reviveApiClient = ({ modelsByBranchType, eventsByType }, branch = '') => {
  function createObject(v) {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k], k))
    
    const branchType = branch + '_' + v.__type
    const Model = v.__type && modelsByBranchType[branchType]

    return Model ? new Model(obj, false, branchType) : obj
  }

  function revive(v, k) {
    if (!isObj(v))           return dateKeyReg.test(k) ? new Date(v) : v
    if (v.__event)           return eventsByType[v.__event] ?? v
    if (v.__e)               return Object.assign(Object.create(e.prototype), Object.keys(v).reduce((acc, k) => ({ ...acc, [k]: revive(v[k], k) }), {}))

                             return isArray(v) ? v.map(revive) : createObject(v)
  }

  return revive
}



export const reviveApiServer = ({ modelsByBranchType, eventsByType }) => {
  function createObject(v) {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k], k))
    
    const Model = v.__branchType && modelsByBranchType[v.__branchType]
    return Model ? new Model(obj, false) : obj
  }

  function revive(v, k) {
    if (!isObj(v))           return dateKeyReg.test(k) ? new Date(v) : v
    if (v.__event)           return eventsByType[v.__event] ?? v
    if (v.__e)               return Object.assign(Object.create(e.prototype), Object.keys(v).reduce((acc, k) => ({ ...acc, [k]: revive(v[k], k) }), {}))

                             return isArray(v) ? v.map(revive) : createObject(v)
  }

  return revive
}




export const reviveServerModelInSpecificModule = db => {
  function createObject(v) {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k]))
    
    const Model = v.__type && db.models[v.__type]
    return Model ? new Model(obj, false) : obj
  }

  function revive(v) {
    return canProxy(v)
      ? isArray(v) ? v.map(revive) : createObject(v)
      : v
  }

  return revive
}




export const createStateReviver = ({ modelsByBranchType, eventsByType, refIds }, refs = {}) => (k, v) => {
  if (!isObj(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__event)   return eventsByType[v.__event] ?? v
  if (v.__e)       return Object.assign(Object.create(e.prototype), v)

  const id = v.__refId

  if (id) {
    if (refs[id]) return refs[id]
    const Model = v.__branchType && modelsByBranchType[v.__branchType]
    const obj = Model ? new Model(v, false) : v.__arr ?? v
    refIds.set(obj, id)
    delete obj.__refId
    return refs[id] = obj
  }

  const Model = v.__branchType && modelsByBranchType[v.__branchType]
  return Model ? new Model(v, false) : v
}




export const createReplacer = ({ refIds }) => (k, v) =>
  typeof v === 'object' && refIds.has(v)
    ? isArray(v)
      ? { __refId: refIds.get(v), __arr: v.slice() }
      : { __refId: refIds.get(v), ...v }
    : v




const isArray = Array.isArray
const keys = Object.keys
const dateKeyReg = /At$/
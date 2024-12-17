import { canProxy } from '../../proxy/helpers/utils.js'
import { e } from '../createEvents.js'


export default ({ modelsByBranchType, eventsByType, refIds } = {}, refs = {}) => {
  const createObject = v => {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k], k))
    
    const Model = v.__branchType && modelsByBranchType[v.__branchType]
    return Model ? new Model(obj) : obj
  }

  function revive(v, k) {
    if (v?.__event)                            return eventsByType[v.type] ?? v
    if (!canProxy(v))                          return dateKeyReg.test(k) && v ? new Date(v) : v
    // if (v.__e && typeof v.event === 'string')  return Object.assign(Object.create(e.prototype), { ...v, event: eventsByType[v.event] })
  
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
  if (v?.__event)                            return eventsByType[v.type] ?? v
  if (!canProxy(v))                          return dateKeyReg.test(k) && v ? new Date(v) : v
  if (v.__e && typeof v.event === 'string')  return Object.assign(Object.create(e.prototype), { ...v, event: eventsByType[v.event] })

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







export const reviveApiClient = ({ modelsByBranchType, eventsByType }, branch) => {
  function createObject(v) {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k], k))
    
    const Model = v.__type && modelsByBranchType[branch + '_' + v.__type]
    return Model ? Model.make(obj) : obj
  }

  function revive(v, k) {
    if (v?.__event)     return eventsByType[v.type] ?? v
    if (!canProxy(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
    if (v.__e && typeof v.event === 'string')  return Object.assign(Object.create(e.prototype), { ...v, event: eventsByType[v.event] })

    return isArray(v) ? v.map(revive) : createObject(v)
  }

  return revive
}



export const reviveApiServer = ({ modelsByBranchType }) => {
  function createObject(v) {
    const obj = {}
    keys(v).forEach(k => obj[k] = revive(v[k], k))
    
    const Model = v.__branchType && modelsByBranchType[v.__branchType]
    return Model ? new Model(obj) : obj
  }

  function revive(v, k) {
    if (!canProxy(v))   return dateKeyReg.test(k) && v ? new Date(v) : v
    return isArray(v) ? v.map(revive) : createObject(v)
  }

  return revive
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
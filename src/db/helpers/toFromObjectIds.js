import { ObjectId } from 'mongodb'


export const toObjectIds = (doc, key) => {
  if (doc instanceof ObjectId || doc instanceof Date || doc instanceof RegExp) {
    return doc
  }
  else if (key && isForeignOrLocalKey(key) && ObjectId.isValid(doc) && doc.length === 24) {
    return new ObjectId(doc)
  }
  else if (Array.isArray(doc)) {
    return isArrayOfIds(doc[0])
      ? doc.map(v => new ObjectId(v))
      : doc.map(v => toObjectIds(v))
  }
  else if (typeof doc === 'object' && doc !== null) {
    return Object.keys(doc).reduce((acc, k) => {
      acc[k] = toObjectIds(doc[k], k)
      return acc
    }, {})
  }

  return doc // primitive
}


export const toObjectIdsSelector = selector => {
  if (selector === undefined) return

  if (typeof selector === 'string') {
    selector = { _id: selector }
  }
  else {
    selector = { ...selector }
  }

  if (selector.id) {
    selector._id = selector.id // replace top level id with _id
    delete selector.id
  }

  return toObjectIds(selector)
}


export const resolveId = field => {
  if (field === 'id') {
    return '_id'
  }
  else if (field === 'forceId') {
    return 'id' // id can be used on actual mongo docs, such as with collections that have both an _id and id field
  }

  return field
}




export const isForeignOrLocalKey = key => endsWithIdReg.test(key) || key === '_id' || key === 'id'

const isArrayOfIds = firstElement => typeof firstElement === 'string' && ObjectId.isValid(firstElement) && firstElement.length === 24 // valid 24 char hex string -- must check if string, cuz ObjectId.isValid(123) is true; NOTE: your app can't use 24 hex strings for any other purpose!


const endsWithIdReg = /(Id|\.id)$/




export const fromObjectIds = doc => {
  if (doc instanceof ObjectId) {
    return doc.toString()
  }
  else if (doc instanceof Date || doc instanceof RegExp) {
    return doc
  }
  else if (Array.isArray(doc)) {
    return doc.map(v => fromObjectIds(v))
  }
  else if (doc && typeof doc === 'object') {
    return Object.keys(doc).reduce((acc, k) => {
      acc[k] = fromObjectIds(doc[k])
      return acc
    }, {})
  }

  return doc // primitive
}



export const toProject = project => {
  if (project?.id !== undefined) {
    const { id, ...proj } = project
    return { ...proj, _id: id }
  }

  return project
}



// only for use for index.id.js which assumes a 3rd party api with id keys, which you would like to keep while storing in Mongo with _id at the same time

export const toIdSelector = (selector = {}) => {
  const id = typeof selector === 'string' ? selector : selector.id
  return id ? { id } : toObjectIds(selector)
}
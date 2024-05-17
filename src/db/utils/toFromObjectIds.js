import { ObjectId } from 'mongodb'


export const toObjectIds = (doc, key) => {
  if (doc instanceof ObjectId || doc instanceof Date || doc instanceof RegExp) {
    return doc
  }
  else if (key && isForeignOrLocalKey(key) && isValidObjectId(doc)) {
    return new ObjectId(doc)
  }
  else if (Array.isArray(doc)) {
    return isArrayOfIds(doc[0])
      ? doc.map(v => new ObjectId(v)) // require arrays of IDs to be assigned to, eg doc.friendIds, to ensure other 24 character strings aren't treated as ObjectIds
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

  selector = { ...selector }

  if (selector.id) {
    selector = { ...selector }
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



const isValidObjectId = str => ObjectId.isValid(str) && str.length === 24

const isForeignOrLocalKey = key => endsWithIdReg.test(key)

const isForeignKeyPlural = key => endsWithIdsReg.test(key) || '$in'

const isArrayOfIds = firstElement => firstElement && isValidObjectId(firstElement)


const endsWithIdReg = /id$/i
const endsWithIdsReg = /Ids$/




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
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




export const toObjectIds = (doc, key) => {
  if (doc instanceof ObjectId || doc instanceof Date || doc instanceof RegExp) {
    return doc
  }
  else if (key && endsWithIdReg.test(key) && isValidObjectId(doc)) {
    return new ObjectId(doc)
  }
  else if (!key && isValidObjectId(doc)) { // elements of an array, eg: $in: ['63e2b73f906c626121ecf696'. '63e2b73f906c626121ecf697'] -- unavoidable bug (for now): 24 character strings that don't use letters above "f" will be considered bson ids
    return new ObjectId(doc)
  }
  else if (Array.isArray(doc)) {
    return doc.map(v => toObjectIds(v))
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




const isValidObjectId = str => ObjectId.isValid(str) && str.length === 24

const endsWithIdReg = /id$/i
export const db = {}

export default (dbRaw, options = {}) => {
  const { commonProperties = [], commonModelProperties = [], models = [], config = {} } = options

  Object.keys(dbRaw).forEach(k => {
    const collection = dbRaw[k]
    const collectionName = k
    const collectionNamePlural = k + 's'

    const mixins = models.map(m => m[k]).filter(m => m)
    
    const getDb = () => db
    const baseProps = { getDb, collectionName, collectionNamePlural }
    const model = combineMixins(baseProps, ...commonModelProperties.map(c => _(c)), ...commonModelProperties, ...mixins)

    const docsBeforeHMR = db[k]?.docs

    const getModel = () => model
    const basePropsDb = { getDb, getModel, collectionName, collectionNamePlural, config }
    db[k] = combineMixins(basePropsDb, ...commonProperties.map(c => _(c)), ...commonProperties, collection)
    
    if (docsBeforeHMR) {
      db[k].docs = docsBeforeHMR
    }
  })

  return db
}



const combineMixins = (...mixins) => {
  const allDescriptors = mixins.reduce((acc, mixin) => {
    const descriptors = Object.getOwnPropertyDescriptors(mixin)

    const next = Object.keys(descriptors).reduce((acc, k) => {
      const descriptor = descriptors[k]

      descriptor.enumerable = false
      descriptor.configurable = true

      acc[k] = descriptor

      return acc
    }, {})

    Object.assign(acc, next)

    return acc
  }, {})


  return Object.defineProperties({}, allDescriptors)
}



// prefix built-in methods with _, so they can be overriden while still accessible as if using `super` in Classes

const _ = methods => {
  const descriptors = Object.getOwnPropertyDescriptors(methods)

  const next = Object.keys(descriptors).reduce((acc, k) => {
    acc['_' + k] = descriptors[k]
    return acc
  }, {})

  return Object.defineProperties({}, next)
}
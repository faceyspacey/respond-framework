export default (models, ...mixins) => {
  const result = {}

  mixins.forEach(mixin => {
    Object.keys(mixin).forEach(k => {
      if (!models[k]) {
        models[k] =  {}
      }
    })
  })
  

  Object.keys(models).forEach(k => {
    const model = models[k]
    const availableMixins = mixins.map(m => m[k]).filter(m => m)

    result[k] = combineMixins(model, ...availableMixins)
  })

  return result
}

const combineMixins = (...mixins) => {
  const descriptors = mixins.reduce((acc, mixin) => {
    Object.assign(acc, Object.getOwnPropertyDescriptors(mixin))
    return acc
  }, {})

  return Object.defineProperties({}, descriptors)
}
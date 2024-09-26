export default (models = {}) => {
  let client = models.client ?? {}
  let shared = models.shared ?? {}

  if (!models.client && !models.shared) {
    client = models
  }

  const keys = Object.keys({ ...shared, ...client })

  return keys.reduce((acc, k) => {
    const s = shared[k] && g(shared[k])
    const c = client[k] && g(client[k])

    const Class = function(doc) {
      if (!doc) return
      Object.defineProperties(this, g(doc)) // unlike Object.assign, this will allow assignment of instant properties of the same name as prototype getters without error
    }

    const base = g({ _name: k, _namePlural: k + 's' })
    const descriptors = Object.assign(base, s, c)

    Object.defineProperty(Class, 'name', { value: k })
    Object.defineProperties(Class.prototype, descriptors)

    acc[k] = Class
    
    return acc
  }, {})
}


const g = Object.getOwnPropertyDescriptors
export default ({ shared = {}, client = {} } = {}) => {
  const keys = Object.keys({ ...shared, ...client })

  return keys.reduce((acc, k) => {
    const s = g(shared[k] || {})
    const c = g(client[k] || {})

    const base = g({ _name: k, _namePlural: k + 's', model: () => descriptors })
    const descriptors = Object.assign(base, s, c)

    const Class = function(doc) {
      Object.assign(this, doc)
    }

    Object.defineProperty(Class, 'name', { value: k })
    Object.defineProperties(Class.prototype, descriptors)

    acc[k] = Class
    
    return acc
  }, {})
}


const g = Object.getOwnPropertyDescriptors
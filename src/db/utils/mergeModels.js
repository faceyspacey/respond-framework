export default ({ shared = {}, client = {} } = {}) => {
  const keys = Object.keys({ ...shared, ...client })

  return keys.reduce((acc, k) => {
    const s = g(shared[k] || {})
    const c = g(client[k] || {})

    const base = g({ _name: k, _namePlural: k + 's', model: () => descriptors })
    const descriptors = Object.assign(base, s, c)

    acc[k] = descriptors
    
    return acc
  }, {})
}


const g = Object.getOwnPropertyDescriptors
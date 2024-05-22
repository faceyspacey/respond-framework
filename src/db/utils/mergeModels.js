export default ({ shared = {}, client = {} } = {}) => {
  const keys = Object.keys({ ...shared, ...client })

  return keys.reduce((acc, k) => {
    const s = g(shared[k] || {})
    const m = g(client[k] || {})

    acc[k] = Object.assign(acc, s, m)
    return acc
  }, {})
}


const g = Object.getOwnPropertyDescriptors
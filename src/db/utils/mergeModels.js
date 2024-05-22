export default ({ shared = {}, server = {} } = {}) => {
  const keys = Object.keys({ ...shared, ...server })

  return keys.reduce((acc, k) => {
    const s = g(shared[k] || {})
    const m = g(server[k] || {})

    acc[k] = Object.assign(acc, s, m)
    return acc
  }, {})
}


const g = Object.getOwnPropertyDescriptors
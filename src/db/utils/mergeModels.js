export default ({ shared = {}, server = {} } = {}) => {
  const keys = Object.keys({ ...shared, ...server })

  return keys.reduce((acc, k) => {
    const s = gopd(shared[k] || {})
    const m = gopd(server[k] || {})

    acc[k] = Object.assign(acc, s, m)
    return acc
  }, {})
}


const gopd = Object.getOwnPropertyDescriptors
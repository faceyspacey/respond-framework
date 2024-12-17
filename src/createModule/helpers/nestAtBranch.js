export default (branch, value, top = {}) => {
  let slice = top
  
  if (branch) {
    const modules = branch.split('.')

    for (const k of modules) {
      slice = slice[k] ?? (slice[k] = {})
    }
  }

  Object.assign(slice, value)

  return top
}
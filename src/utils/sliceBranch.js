export default function sliceBranch(obj, branch) {
  if (!branch || !obj) return obj
  const modules = branch.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}



export const strip = (a, b) =>                    // 'admin', 'admin.foo' or 'admin', 'admin'
  a ? b.replace(new RegExp(`^${a}\.?`), '') : b   // 'foo'                   ''

export const prepend = (a = '', b = '') =>
  a
    ? b ? `${a}.${b}` : a
    : b

    
export const stripBranchWithUnknownFallback = (a, b) =>
  a
    ? b.indexOf(a) === 0  // a is ancestor of b
      ? strip(a, b)
      : 'unknown.' + b
    : b 






export const nestAtBranch = (branch, value, top = {}) => {
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
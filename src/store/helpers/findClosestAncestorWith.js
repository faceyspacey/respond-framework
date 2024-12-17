export default (key, branch, respond) => {
  const { top, focusedBranch: fb } = respond
  const b = fb ? (branch ? fb + '.' + branch : fb) : branch

  if (!b) return top       // top

  let mod = top

  return b                          // 'admin.foo.bar'
    .split('.')                     // ['admin', 'foo', 'bar]
    .slice(0, -1)                   // ['admin', 'foo']   
    .map(k => mod = mod[k])         // [admin, foo]
    .reverse()                      // [foo, admin]
    .find(b => b[key])              // admin.db
    ?? top                          // admin ?? top
}
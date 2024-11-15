export default (key, branch, top) => {
  if (!branch) return top[key]  // top.db

  let mod = top

  return branch                 // 'admin.foo.bar'
    .split('.')                     // ['admin', 'foo', 'bar]
    .slice(0, -1)                   // ['admin', 'foo']   
    .map(k => mod = mod[k])         // [admin, foo]
    .reverse()                      // [foo, admin]
    .find(b => b[key])              // admin.db
    ?.[key] ?? top[key]             // admin.db ?? top.db
}


export const findClosestAncestorWith = (key, branch, top) => {
  if (!branch) return top       // top

  let mod = top

  return branch                 // 'admin.foo.bar'
    .split('.')                     // ['admin', 'foo', 'bar]
    .slice(0, -1)                   // ['admin', 'foo']   
    .map(k => mod = mod[k])         // [admin, foo]
    .reverse()                      // [foo, admin]
    .find(b => b[key])              // admin.db
    ?? top                          // admin ?? top
}


export const findClosestAncestorWithObjectContaining = (key, key2, branch, top) => {
  if (!branch) return top       // top

  let mod = top

  return branch                 // 'admin.foo.bar'
    .split('.')                     // ['admin', 'foo', 'bar]
    .slice(0, -1)                   // ['admin', 'foo']   
    .map(k => mod = mod[k])         // [admin, foo]
    .reverse()                      // [foo, admin]
    .find(b => b[key]?.[key2])      // admin.replays.db
    ?? top                          // admin ?? top
}
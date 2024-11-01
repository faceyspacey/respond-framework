export default (key, modulePath, top) => {
  if (!modulePath) return top[key]  // top.db

  let mod = top

  return modulePath                 // 'admin.foo.bar'
    .split('.')                     // ['admin', 'foo', 'bar]
    .slice(0, -1)                   // ['admin', 'foo']   
    .map(k => mod = mod[k])         // [admin, foo]
    .reverse()                      // [foo, admin]
    .find(p => p[key])              // admin.db
    ?.[key] ?? top[key]             // admin.db ?? top.db
}


export const findClosestAncestorWith = (key, modulePath, top) => {
  if (!modulePath) return top       // top

  let mod = top

  return modulePath                 // 'admin.foo.bar'
    .split('.')                     // ['admin', 'foo', 'bar]
    .slice(0, -1)                   // ['admin', 'foo']   
    .map(k => mod = mod[k])         // [admin, foo]
    .reverse()                      // [foo, admin]
    .find(p => p[key])              // admin.db
    ?? top                          // admin ?? top
}
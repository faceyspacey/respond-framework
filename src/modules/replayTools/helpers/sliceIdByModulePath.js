export default (id, mp) => {
  if (!mp) return id
  const moduleDir = mp.replace(/\./g, '/')  + '/' // eg: grand.child -> grand/child
  return id.replace(moduleDir, '')                // eg: child/grand/drawer/test.js -> drawer/test.js -- erase moduleDir when the perspective is set to a specific module, so test name is shorter
}
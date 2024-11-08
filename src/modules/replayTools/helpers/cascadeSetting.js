export default (state, e, path, configs) => {
  const config = configs[path]
  const setting = config[e.meta.name]
  
  if (setting.cascade === false) return

  const denied = []

  // pre-sorted by ancestors first in replays/index.js.createReplaySettings.traverseAllModulesBreadthFirst
  Object.keys(state) // eg: ['', 'admin', 'website', 'admin.foo', 'admin.foo.etc']
    .forEach(p => {
      const isDescendent = p.indexOf(path) === 0 && p !== path
      if (!isDescendent) return

      const config = configs[p]
      const setting = config[e.meta.name]

      if (!setting) return

      if (setting.accept === false) return denied.push(p)
      if (denied.find(p2 => p2.indexOf(p) === 0)) return

      Object.assign(state[p], e.form)
    })
}
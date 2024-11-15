export default (state, e, branch, configs) => {
  const config = configs[branch]
  const setting = config[e.meta.name]
  
  if (setting.cascade === false) return

  const denied = []

  // pre-sorted by ancestors first in replays/index.js.createReplaySettings.traverseAllModulesBreadthFirst
  Object.keys(state) // eg: ['', 'admin', 'website', 'admin.foo', 'admin.foo.etc']
    .forEach(b => {
      const isDescendent = b.indexOf(branch) === 0 && b !== branch
      if (!isDescendent) return

      const config = configs[b]
      const setting = config[e.meta.name]

      if (!setting) return

      if (setting.accept === false) return denied.push(b)
      if (denied.find(p2 => p2.indexOf(b) === 0)) return

      Object.assign(state[b], e.form)
    })
}
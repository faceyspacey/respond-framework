import { nestAtModulePath } from '../../../utils/sliceByModulePath.js'
  

export default (state, e, path, respond) => {
  const config = respond.replayConfigsByPaths[path]
  const setting = config[e.meta.name]
  
  if (setting.cascade === false) return

  const denied = []

  // pre-sorted by ancestors first in replays/index.js.createReplaySettings.traverseAllModulesBreadthFirst
  respond.replaySettingsPaths // eg: ['', 'admin', 'website', 'admin.foo', 'admin.foo.etc']
    .forEach(p => {
      const isDescendent = p.indexOf(path) === 0 && p !== path
      if (!isDescendent) return

      const config = respond.replayConfigsByPaths[p]
      const setting = config[e.meta.name]

      if (!setting) return

      if (setting.accept === false) return denied.push(p)
      if (denied.find(p2 => p2.indexOf(p) === 0)) return

      nestAtModulePath(state, p, e.form)
    })
}
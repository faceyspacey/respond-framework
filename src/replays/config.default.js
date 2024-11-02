export default {
  path: {
    placeholder: 'path: eg /',
  },

  module: {
    defaultValueDevelopment: '',
    createLabel: o => 'module: ' + (o?.value || 'top'),
    options: (settings, { topState: state }) => {
      const selected = state.replaySettings.module
      let paths = Object.keys(state.respond.modulePaths).filter(p => p.indexOf('replayTools') !== 0 && p !== 'undefined')

      if (selected) {
        paths = paths.map(p => p ? selected + '.' + p : selected)
        paths.unshift('')
      }

      return paths.map(v => ({ value: v, label: v || 'top' }))
    },
  },
}
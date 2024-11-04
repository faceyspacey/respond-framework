export default {
  url: {
    placeholder: 'url: eg /',
  },

  module: {
    defaultValueDevelopment: '',
    createLabel: o => 'module: ' + (o?.value || 'top'),
    options: (settings, state) => {
      const { modulePathsAll } = state.topState.respond
      return modulePathsAll.map(v => ({ value: v, label: v || 'top' }))
    },
  },
}
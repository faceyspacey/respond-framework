export default {
  url: {
    placeholder: 'url: eg /',
  },

  focusedModulePath: {
    defaultValueDevelopment: '',
    createLabel: o => 'module: ' + (o?.value || 'top'),
    options: (settings, state) => {
      const { modulePathsAll } = state.respond
      return modulePathsAll.map(v => ({ value: v, label: v || 'top' }))
    },
  },
}
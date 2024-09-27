export default {
  open: {
    boolean: true,
    defaultValueDevelopment: false,
    builtIn: true,
  },
  advanced: {
    boolean: true,
    defaultValueDevelopment: false,
    builtIn: true,
  },
  module: {
    options: (settings, store) => {
      const selected = store.replays.settings.module
      let paths = Object.keys(store.modulePathsAll).filter(p => p.indexOf('replayTools') !== 0)

      if (selected) {
        paths = paths.map(p => p ? selected + '.' + p : selected)
        paths.unshift('')
      }

      return paths.map(v => ({ value: v, label: v || 'top' }))
    },
    defaultValueDevelopment: '',
    createLabel: o => 'module: ' + (o?.value || 'top'),
    builtIn: true,
  },
  // path: {
  //   options: [],
  //   createLabel: o => 'path: ' + (o?.value || 'none'),
  //   builtIn: true,
  // },
  path: {
    placeholder: 'path: eg /',
    builtIn: true,
  },
  latency: {
    placeholder: 'latency: simulated api latency (ms)',
    builtIn: true,
    format: v => parseInt(v?.toString().replace(/\D+/g, '')),
  },
  testDelay: {
    placeholder: 'testDelay: between replayed events (ms)',

    builtIn: true,
    format: v => parseInt(v?.toString().replace(/\D+/g, '')),
  },
}
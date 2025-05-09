import * as plugins from './createModule/plugins/index.js'


export * from './createModule/plugins/index.js'

export const defaultSyncPlugins = [
  plugins.edit,
  plugins.markPop,
  plugins.markCached
]

export const defaultAsyncPlugins = [
  plugins.before,
  plugins.validate,
  plugins.auth,
  plugins.reduce,
  plugins.changePath,
  plugins.custom,
  plugins.optimistic,
  plugins.fetch(),
  plugins.tap,
  plugins.submit,
  plugins.redirect,
  plugins.end,
  plugins.after,
]

export const defaultPlugins = [...defaultSyncPlugins, ...defaultAsyncPlugins]

export default defaultPlugins
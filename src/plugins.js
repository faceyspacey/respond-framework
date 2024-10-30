import * as plugins from './store/plugins/index.js'


export * from './store/plugins/index.js'

export const defaultSyncPlugins = [
  plugins.edit,
  plugins.markPop,
  plugins.markCached
]

export const defaultAsyncPlugins = [
  plugins.before,
  plugins.validate,
  plugins.reduce,
  plugins.changePath,
  plugins.optimistic,
  plugins.fetch(),
  plugins.tap,
  plugins.submit,
  plugins.redirect,
  plugins.end,
  plugins.after,
  plugins.auth()
]

export const defaultPlugins = [...defaultSyncPlugins, ...defaultAsyncPlugins]

export default defaultPlugins
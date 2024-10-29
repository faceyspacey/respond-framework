export * from './store/plugins/index.js'

import * as plugins from './store/plugins/index.js'


export const defaultPlugins = [ // default plugins
  plugins.edit,
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
  plugins.auth(),
]


export default defaultPlugins
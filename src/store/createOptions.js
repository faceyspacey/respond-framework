import createHistoryDefault from '../history/index.js'
import defaultPlugins from './plugins/index.js'
import defaultPluginsSync from './pluginsSync/index.js'
import displaySelectorsInDevtools from './utils/displaySelectorsInDevtools.js'


export default topOptions => ({
  merge: {},
  defaultPlugins,
  defaultPluginsSync,
  createHistory: createHistoryDefault,
  ...topOptions,
  displaySelectorsInDevtools: displaySelectorsInDevtools(topOptions),
})


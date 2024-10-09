import createHistoryDefault from '../history/index.js'
import defaultPlugins from './plugins/index.js'
import defaultPluginsSync from './pluginsSync/index.js'
import displaySelectorsInDevtools from './utils/displaySelectorsInDevtools.js'
import { isProd } from '../../dist/utils/bools.js'

export default topOptions => ({
  merge: {},
  defaultPlugins,
  defaultPluginsSync,
  createHistory: createHistoryDefault,
  replayToolsEnabled: !isProd,
  ...topOptions,
  displaySelectorsInDevtools: displaySelectorsInDevtools(topOptions),
})


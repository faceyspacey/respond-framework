import defaultPlugins from './plugins/index.js'
import defaultPluginsSync from './pluginsSync/index.js'
import displaySelectorsInDevtools from './utils/displaySelectorsInDevtools.js'
import { isProd } from '../utils.js'


export default topOptions => ({
  merge: {},
  defaultPlugins,
  defaultPluginsSync,
  replayToolsEnabled: !isProd,
  ...topOptions,
  displaySelectorsInDevtools: displaySelectorsInDevtools(topOptions),
})
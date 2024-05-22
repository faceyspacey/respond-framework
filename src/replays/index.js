import replays from '../replays.js'

import { isProd } from '../utils/bools.js'
import mergeDeep from '../utils/mergeDeep.js'
import configDefault from './config.default.js'
import sendTrigger from './sendTrigger.js'
import replayLastEvent from './replayLastEvent.js'
import replayEvents, { restoreEvents } from './replayEvents.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'


export default ({
  config: conf,
  createSettings = defaultCreateSettings,
  createSeed = defaultCreateSeed,
  createToken = defaultCreateToken,
  replay = false,
  ...options
} = {}) => {
  const prev = replays

  const isHMR = !!replays.options // won't have on first call
  const configChanged = conf !== prev.conf
  
  const isCached = isHMR && !replay && !configChanged 

  if (isCached) {
    const next = { ...prev, replay }
    Object.assign(replays, next)
    return next
  }

  const config = mergeDeep({ ...configDefault }, conf)

  const settings = createSettings(config, options.settings)
  const seed = isProd ? {} : createSeed(settings, options)
  const token = createToken(settings, seed, options)

  const next = { conf, config, replay, options, settings, seed, token, sendTrigger, replayLastEvent, replayEvents, restoreEvents, devtoolsIndexes: {} }
  Object.assign(replays, next)
  
  return next
}

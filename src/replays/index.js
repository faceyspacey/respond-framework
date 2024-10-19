import replays from '../replays.js'

import { isProd } from '../utils/bools.js'
import mergeDeep from '../utils/mergeDeep.js'
import configDefault from './config.default.js'
import sendTrigger from './sendTrigger.js'
import replayLastEvent from './replayLastEvent.js'
import replayEvents, { restoreEvents } from './replayEvents.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateCookies from '../cookies/index.js'
import defaultCreateToken from './utils/createToken.js'

import { findInClosestAncestor } from '../store/api/index.js'


export default async (top, opts) => {
  const hydration = replay  ? { ...opts.hydration, replayTools }
                      : hmr ? { ...prevState,      replayTools }
                      :       await getSessionState(opts) || opts.hydration
  const {
    config: conf,
    createSettings = defaultCreateSettings,
    createSeed = defaultCreateSeed,
    createCookies = defaultCreateCookies,
    createToken = defaultCreateToken,
    replay = false,
    hmr = false,
    caching = true,
    ...options
  } = top.replays ?? findInClosestAncestor('replays', modulePath, top)

  const isCached = hmr && caching && !replay && conf === replays.conf // cached when hmr and caching enabled, but not replays, and not if hmr was caused by editing replays config
  if (isCached) return Object.assign(replays, { replay: false }) // prevent rebuilding seed (which can be slow) -- caching can be disabled if results from the db are inconsitent between hmr replays of last event, but for most development use cases, it's fine

  const config = mergeDeep({ ...configDefault }, conf)

  const settings = createSettings(config, options.settings ?? hydration?.replays.settings)
  const seed = isProd ? {} : createSeed(settings, options)
  const cookies = createCookies()
  const token = isProd ? await cookies.get('token') : createToken(settings, seed, options)

  const next = { conf, config, hydration, replay, hmr, cookies, options, settings, seed, token, sendTrigger, replayLastEvent, replayEvents, restoreEvents, devtoolsIndexes: {} }
  Object.assign(replays, next)

  return next
}

import replays from '../replays.js'

import { isProd } from '../utils/bools.js'
import mergeDeep from '../utils/mergeDeep.js'
import defaultDefaultConfig from './config.default.js'
import replayEvents from './replayEvents.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateCookies from '../cookies/index.js'
import defaultCreateToken from './utils/createToken.js'

import findInClosestAncestor from '../utils/findInClosestAncestor.js'
import getSessionState from '../utils/getSessionState.js'
import { traverseModulesDepthFirst } from '../utils/sliceByModulePath.js'


export default async (top, opts, state) => {
  const { replays: hydratedReplays = {}, ...hydration } = await getSessionState(opts) ?? {}
  console.log('hydration', opts, hydratedReplays, hydration)
  
  const settingsRaw = hydratedReplays.settings
  const replayModulePath = settingsRaw?.modulePath

  const getTopState = () => state
  const status = hydratedReplays.status ?? opts.status ?? 'ready'
  
  window.__respondContext.idCounter = hydration.__respondContext?.idCounter ?? 10000
  state.__respondContext = window.__respondContext

  const {
    createSettings = defaultCreateSettings,
    createSeed = defaultCreateSeed,
    createCookies = defaultCreateCookies,
    createToken = defaultCreateToken,
    defaultConfig = defaultDefaultConfig,
    config: conf,
    caching = true,
    ...options
  } = top.replays ?? findInClosestAncestor('replays', replayModulePath, top)

  const proto = Object.getPrototypeOf(replays)
  const isCached = caching && status === 'hmr' && conf === replays.conf // cached when hmr and caching enabled, but not replays, and not if hmr was caused by editing replays config
  
  if (isCached) {
    Object.assign(proto, { hydration })
    return Object.assign(replays, { status, getTopState }) // prevent rebuilding seed (which can be slow) -- caching can be disabled if results from the db are inconsitent between hmr replays of last event, but for most development use cases, it's fine
  }

  const config = mergeDeep({ ...defaultConfig }, conf)

  const settings = createSettings(config, settingsRaw)
  const seed = isProd ? {} : createSeed(settings, options)
  const cookies = createCookies()
  const token = isProd ? await cookies.get('token') : createToken(settings, seed, options)

  Object.assign(proto, { replayModulePath, conf, config, hydration, cookies, options, seed, token, replayEvents, ready })

  return Object.assign(replays, { settings, status, getTopState })
}


function ready() {
  this.status = 'ready'
}

const createSeedRecursive = (top, settings, options) => {
  let prevDb
  const seed = {}

  traverseModulesDepthFirst(top, (state, modulePath) => {
    if (!state.replays) return

    const createSeed = state.replays.createSeed ?? defaultCreateSeed
    const db = mergeDb(state.replays.db, prevDb)
    
    seed[modulePath] = prevDb = createSeed(settings, options, db)
  })
}



const mergeDb = (db, prevDb) => {
  if (!prevDb) return db

  Object.keys(db).forEach(k => {
    if (prevDb[k] === 'object') {
      db[k].docs = prevDb[k].docs ?? {}
    }
  })
}
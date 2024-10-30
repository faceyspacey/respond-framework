import replays from '../replays.js'

import { isProd } from '../utils/bools.js'
import mergeDeep from '../utils/mergeDeep.js'
import defaultDefaultConfig from './config.default.js'
import replayEvents from './replayEvents.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateCookies from '../cookies/index.js'
import defaultCreateToken from './utils/createToken.js'

import findInClosestAncestor, { findClosestAncestorWith } from '../utils/findInClosestAncestor.js'
import getSessionState from '../utils/getSessionState.js'
import sliceByModulePath, { findByModulePath, traverseModules, traverseModulesDepthFirst } from '../utils/sliceByModulePath.js'


export default async (top, opts, state) => {
  const { replays: hydratedReplays = {}, ...hydration } = await getSessionState(opts) ?? {}
  console.log('hydration', opts, hydratedReplays, hydration)
  
  const settingsSupplied = hydratedReplays.settings ?? {}
  const replayModulePath = settingsSupplied?.modulePath

  const getTopState = () => state
  const status = hydratedReplays.status ?? opts.status ?? 'ready'
  
  window.__respondContext.idCounter = hydration.__respondContext?.idCounter ?? 10000
  state.__respondContext = window.__respondContext

  top = top.replays ? top : findClosestAncestorWith('replays', replayModulePath, top) ?? top

  let {
    createSettings = defaultCreateSettings,
    createSeed = defaultCreateSeed,
    createCookies = defaultCreateCookies,
    createToken = defaultCreateToken,
    defaultConfig = defaultDefaultConfig,
    config: conf,
    caching = true,
    db,
    ...options
  } = top.replays

  const proto = Object.getPrototypeOf(replays)
  const isCached = caching && status === 'hmr' && conf === replays.conf // cached when hmr and caching enabled, but not replays, and not if hmr was caused by editing replays config
  
  if (isCached) {
    Object.assign(proto, { hydration })
    return Object.assign(replays, { status, getTopState }) // prevent rebuilding seed (which can be slow) -- caching can be disabled if results from the db are inconsitent between hmr replays of last event, but for most development use cases, it's fine
  }

  // const config = mergeDeep({ ...defaultConfig }, conf)
  // const settings = createSettings(config, settingsSupplied)
  // const seed = isProd ? {} : createSeed(settings, options, db)

  const { config, settings, db: nextDb, seed } = createSeedRecursive(top, settingsSupplied)
  db = nextDb

  console.log('yo', config, settings, db)

  const cookies = createCookies()
  const token = isProd ? await cookies.get('token') : createToken(settings, db, options)

  Object.assign(proto, { db, replayModulePath, conf, config, hydration, cookies, options, seed, token, replayEvents })

  return Object.assign(replays, { settings, status, getTopState })
}



const createSeedRecursive = (top, settingsSupplied) => {
  let db = {}
  
  top.moduleKeys = ['admin', 'website']
  top.admin.moduleKeys = ['foo']
  top.website.moduleKeys = []
  top.admin.foo.moduleKeys = []

  top.modulePath = ''
  top.admin.modulePath = 'admin'
  top.website.modulePath = 'website'
  top.admin.foo.modulePath = 'admin.foo'

  const configsByPath = {}
  const settingsByPath = {}

  const traverseModuleChildren = (state, configsByPath, settingsByPath) => {
    for (const k of state.moduleKeys) {
      configsByPath[k] = {}
      settingsByPath[k] = {}
      traverseModuleChildren(state[k], configsByPath[k], settingsByPath[k])
    }
  }

  traverseModuleChildren(top, configsByPath, settingsByPath)

  traverseModulesDepthFirst(top, state => {
    const { replays, modulePath } = state
    if (!replays) return

    const {
      createSettings = defaultCreateSettings,
      createSeed = defaultCreateSeed,
      defaultConfig = defaultDefaultConfig,
      config: conf,
      db: nextDb = {},
      ...options
    } = replays

    const config = mergeDeep({ ...defaultConfig }, conf)
    const settingsForModule = findByModulePath(settingsSupplied, modulePath)
    const settings = createSettings(config, settingsForModule)

    mergeDb(nextDb, db)
    createSeed(settings, options, nextDb)

    Object.assign(sliceByModulePath(configsByPath, modulePath), config)
    Object.assign(sliceByModulePath(settingsByPath, modulePath), settings)
  })

  return { seed: {}, db, config: configsByPath, settings: settingsByPath }
}



const mergeDb = (nextDb, db) => {
  Object.keys(nextDb).forEach(k => {
    nextDb[k].docs = db[k]?.docs ?? {}
    db[k] ??= nextDb[k]
  })
}
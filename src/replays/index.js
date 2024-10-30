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


export default async (topModule, opts, state) => {
  const { replays: hydratedReplays = {}, ...hydration } = await getSessionState(opts) ?? {}
  console.log('hydration', opts, hydratedReplays, hydration)
  
  const settingsSupplied = hydratedReplays.settings ?? {}
  const replayModulePath = settingsSupplied?.module

  const getTopState = () => state
  const status = hydratedReplays.status ?? opts.status ?? 'ready'
  
  window.__respondContext.idCounter = hydration.__respondContext?.idCounter ?? 10000
  state.__respondContext = window.__respondContext

  const top = findClosestAncestorWith('replays', replayModulePath, topModule) ?? topModule

  let {
    createSettings = defaultCreateSettings,
    createSeed = defaultCreateSeed,
    createCookies = defaultCreateCookies,
    createToken = defaultCreateToken,
    defaultConfig = defaultDefaultConfig,
    config: conf,
    caching = true,
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

  const finalize = async (state) => {
    const { config, settings, db, seed } = createSeedRecursive(topModule, state, settingsSupplied, replayModulePath)
    const token = isProd ? await cookies.get('token') : createToken(settings, db, options)

    Object.assign(proto, { config, db, token, seed })
    Object.assign(replays, { settings })

    state.replayTools.form = settings
  }

  const cookies = createCookies()
  
  Object.assign(proto, { replayModulePath, conf, hydration, cookies, options, replayEvents, finalize })

  return Object.assign(replays, { status, getTopState })
}



const createSeedRecursive = (topModule, top, settingsSupplied, replayModulePath) => {
  let db = {}
  
  const configsByPath = {}
  const settingsByPath = {}

  const traverseModuleChildren = (state, configsByPath, settingsByPath) => {
    for (const k of state.moduleKeys) {
      if (k === 'replayTools') continue
      configsByPath[k] = {}
      settingsByPath[k] = {}
      traverseModuleChildren(state[k], configsByPath[k], settingsByPath[k])
    }
  }

  traverseModuleChildren(top, configsByPath, settingsByPath)

  traverseModulesDepthFirst(top, state => {
    const { modulePath } = state
    if (modulePath === 'replayTools') return

    const mp = replayModulePath
      ? modulePath ? `${replayModulePath}.${modulePath}` : replayModulePath
      : modulePath

    const mod = sliceByModulePath(topModule, mp)

    const { replays } = mod
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
import replaysRef from '../replays.js'
import { isProd } from '../utils/bools.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'

import sliceByModulePath, { prependPath, findByModulePath, traverseModulesDepthFirst } from '../utils/sliceByModulePath.js'
import replayEvents from './replayEvents.js'


export default (state, session) => {
  const { top, cookies } = state.respond

  const replays = createReplaysForModules(top, state, session.replaySettings)

  Object.assign(replays, { replayEvents })
  Object.assign(replaysRef, replays)

  Object.defineProperty(state, 'replays', { value: replaysRef, enumerable: false, configurable: true })
  Object.defineProperty(state.replayTools, 'replays', { value: replaysRef, enumerable: false, configurable: true })

  const createToken = top.replays.createToken ?? defaultCreateToken 
  state.token = isProd ? cookies.get('token') : createToken(replays)
}


const createReplaysForModules = (topModule, top, settings) => {
  const db = {}

  traverseModulesDepthFirst(top, state => {
    const { modulePath } = state
    if (modulePath === 'replayTools') return

    const path = prependPath(settings.module, modulePath)
    const mod = sliceByModulePath(topModule, path) // find matching original module out of original module tree, even though focused module state may be lower
    
    state.respond.replays = mod.replays
      ? createReplays(modulePath, settings, db, mod.replays)
      : { config: {}, settings: {}, db: {}, options: {} }
  })

  return top.respond.replays
}




const createReplays = (modulePath, settingsSupplied, sharedDb, {
  createSettings = defaultCreateSettings,
  createSeed = defaultCreateSeed,
  config,
  db = {},
  ...options
}) => {
  const settingsForModule = findByModulePath(settingsSupplied, modulePath)
  const settings = createSettings(config, settingsForModule)

  mergeDb(db, sharedDb)
  createSeed(settings, options, db)

  Object.defineProperty(db, 'replays', { enumerable: false, configurable: true, value: { settings } })

  return { settings, config, db, options: {} }
}



// Collections with the same name will share `docs` object, and ancestor modules
// will receive collections created in child modules even if they don't themselves have it.

// This is to ensure docs sharing will jump over intermediary modules that don't require
// the given collection, and so by the end `store.replays.db` will contain all collections.


const mergeDb = (db, sharedDb) => {
  Object.keys(db).forEach(k => {
    db[k].docs = sharedDb[k]?.docs ?? {}
    sharedDb[k] ??= db[k]
  })
}
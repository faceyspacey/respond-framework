import replaysRef from '../replays.js'
import { isProd } from '../utils/bools.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'

import sliceByModulePath, { prependPath, findByModulePath, traverseModulesDepthFirst, traverseModuleChildren, traverseModules } from '../utils/sliceByModulePath.js'
import replayEvents from './replayEvents.js'
import findInClosestAncestor, { findClosestAncestorWith } from '../utils/findInClosestAncestor.js'


export default (state, session) => {
  const { top, cookies } = state.respond
  const replays = createReplaysForModules(top, state, session.replaySettings)

  Object.getPrototypeOf(state.replayTools).replays = Object.getPrototypeOf(state).replays = Object.assign(replaysRef, replays)

  session.token = isProd ? cookies.get('token') : (top.replays.createToken ?? defaultCreateToken)(replays)
}


export const createReplaySettings = (topModule, session) => {
  const { replayTools, replaySettings: settings } = session

  const replayToolsForm = {}
  const replayConfigs = {}

  const traverseModules = (mod, lastReplays = { config: {}, settings: {} }, p = '') => {
    if (mod.replays) {
      lastReplays = {
        ...mod.replays,
        settings: defaultCreateSettings(mod.replays.config, settings[p])
      }
    }

    replayConfigs[p] = lastReplays.config
    replayToolsForm[p] = lastReplays.settings

    replaysByPath.set(p, lastReplays)
  
    for (const k of mod.moduleKeys) {
      traverseModules(mod[k], lastReplays, p ? `${p}.${k}` : k)
    }
  }

  traverseModules(topModule)

  return { replayConfigs, replayToolsForm}
}


const replaysByPath = new Map

const createReplaysForModules = (topModule, topState, settings) => {
  const sharedDb = {}

  traverseModulesDepthFirst(topModule, mod => { // depth-first so parent modules' createSeed function can operate on existing seeds from child modules
    const { modulePath: path } = mod
    if (path === 'replayTools') return

    // const path = prependPath(settings.module, modulePath)
    // const mod = sliceByModulePath(topModule, path) // find matching original module out of original module tree, even though focused module state may be lower

    const replays = replaysByPath.get(path)

    if (mod.replays) { // only call for modules that have actual replays and therefore db/seed data
      const seedData = createReplaySeed(sharedDb, replays) // pass in replays containing pre-created settings with top-down inherited settings
      Object.assign(replays, seedData) // assign to a shared replays reference that will contain inherited settings
    }

    const isDescendentOrFocusedTop = path.indexOf(settings.module ?? '') === 0
    if (!isDescendentOrFocusedTop) return // mod is ancestor of focused module (we needed only to traverse all the way back up to gather all settings, but there will be no state to assign state.respond.replays)

    const normalizedPath = path.replace(settings.module ?? '', '').replace(/^\./, '')
    const state = sliceByModulePath(topState, normalizedPath)

    state.respond.replays = replays // now, by a sharing a reference, child modules who didn't have replays will have BOTH the correct top-down inherited settings + bottom-up merged db/seed
  })

  replaysByPath.clear()
  
  return topState.respond.replays
}




const createReplaySeed = (sharedDb, {
  settings = {},
  createSeed = defaultCreateSeed,
  db = {},
  ...options
}) => {
  mergeDb(db, sharedDb)
  createSeed(settings, options, db)

  Object.defineProperty(db, 'replays', { enumerable: false, configurable: true, value: { settings } })

  return { db, options: options, replayEvents }
}



// Collections with the same name will share `docs` object, and ancestor modules
// will receive collections created in child modules even if they don't themselves have it.

// This is to ensure docs sharing will jump over intermediary modules that don't require
// the given collection, and so by the end `store.replays.db` will contain all collections.


const mergeDb = (db, sharedDb) => {
  Object.keys(db).forEach(k => {
    const collection = db[k]
    if (collection.share === false) return

    const k2 = collection.shareKey ?? k

    collection.docs = sharedDb[k2]?.docs ?? {}
    sharedDb[k2] = collection
  })
}
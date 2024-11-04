import replaysRef from '../replays.js'
import { isProd } from '../utils/bools.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'

import replayEvents from './replayEvents.js'
import { stripPath } from '../utils/sliceByModulePath.js'


export default (state, session, focusedPath) => {
  const { top, cookies } = state.respond
  const { replayConfigs, replayToolsForm } = createReplaySettings(top, state, session.replaySettings, focusedPath)

  state.replayTools.respond.replayConfigs = replayConfigs
  state.replayTools.form = replayToolsForm

  const replays = state.respond.replays
  Object.getPrototypeOf(state.replayTools).replays = Object.getPrototypeOf(state).replays = Object.assign(replaysRef, replays)

  session.token = isProd ? cookies.get('token') : (top.replays.createToken ?? defaultCreateToken)(replays)
}


export const createReplaySettings = (topModule, topState, replaySettings, focusedPath) => {
  const replayToolsForm = {}
  const replayConfigs = {}

  const callbacks = []
  const db = {}
  
  const traverseModules = (mod, lastReplays, p = '') => {
    if (mod.replays) {
      const settings = defaultCreateSettings(mod.replays.config, replaySettings[p])
      lastReplays = { ...mod.replays, settings }
    }

    replayConfigs[p] = lastReplays.config
    replayToolsForm[p] = lastReplays.settings

    callbacks.unshift(createReplay(mod, lastReplays, focusedPath, p, db))
  
    for (const k of mod.moduleKeys) {
      traverseModules(mod[k], lastReplays, p ? `${p}.${k}` : k)
    }
  }

  traverseModules(topModule, { config: {}, settings: {} })

  callbacks.forEach(c => c(topState)) // depth-first so parent modules' createSeed function can operate on existing seeds from child modules

  return { replayConfigs, replayToolsForm }
}




const createReplay = (mod, lastReplays, focusedPath, p, sharedDb) => topState => { 
  if (mod.replays) { // only call for modules that have actual replays and therefore db/seed data
    const seedData = createReplaySeed(sharedDb, lastReplays) // pass in replays containing pre-created settings with top-down inherited settings
    Object.assign(lastReplays, seedData) // assign to a shared replays reference that will contain inherited settings
  }

  const state = stateForNormalizedPath(topState, focusedPath, p)
  if (state) state.respond.replays = lastReplays // now, by a sharing a reference, child modules who didn't have replays will have BOTH the correct top-down inherited settings + bottom-up merged db/seed
}


const createReplaySeed = (sharedDb, { db = {}, settings = {}, createSeed = defaultCreateSeed, ...options }) => {
  mergeDb(db, sharedDb)
  createSeed(settings, options, db)

  Object.defineProperty(db, 'replays', { enumerable: false, configurable: true, value: { settings } })

  return { db, options, replayEvents }
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


const stateForNormalizedPath = (topState, focusedPath = '', p) => {
  const isDescendentOrFocusedTop = p.indexOf(focusedPath) === 0
  if (!isDescendentOrFocusedTop) return // mod is ancestor of focused module (we needed only to traverse all the way back up to gather all settings, but there will be no state to assign state.respond.replays)

  const normalizedPath = stripPath(focusedPath, p)
  return topState.modulePaths[normalizedPath]
}




export const createAllModulePaths = (mod, paths, p = '') => {
  mod.moduleKeys = []
  mod.modulePath = p

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (isMod) {
      const path = p ? `${p}.${k}` : k
      mod.moduleKeys.push(k)
      paths.push(path)
      createAllModulePaths(v, paths, path)
    }
  })

  return paths
}
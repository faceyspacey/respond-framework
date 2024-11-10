import { isProd } from '../utils/bools.js'

import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'

import { nestAtModulePath, stripPath } from '../utils/sliceByModulePath.js'
import { isModule } from '../store/reserved.js'
import { reviveSeedDb } from '../utils/revive.js'


export default (state, session) => {
  const { top, cookies } = state.respond
  const { settings, focusedModulePath = '', status } = session.replayState

  const start = new Date
  const replayTools = createReplaySettings(top, state, settings, focusedModulePath, status === 'hmr', session.__db)

  delete session.__db
  console.log('replayTools', new Date - start)
  
  Object.assign(state.replayTools, { ...replayTools, focusedModulePath })

  state.replayTools.respond.replays = Object.getPrototypeOf(state.replayTools).replays = state.respond.replays

  const createToken = top.replays.createToken ?? defaultCreateToken
  session.token = isProd ? cookies.get('token') : createToken(state.respond.replays)
}


export const createReplaySettings = (topModule, topState, settingsModule, focusedModulePath, hmr, dbSession) => {
  const configsByPath = {}
  const settingsByPath = {}

  const depthFirstCallbacks = []
  const db = {}

  const settings = {}
  const nestingPath = settingsModule.module ?? focusedModulePath // settings with a module start higher than the focusedModulePath where they get their ancestor replays from
  nestAtModulePath(settings, nestingPath, settingsModule) // settingsModule is provided starting at the given module, but we need to traverse from the top to gather possible parent replays

  const traverseAllModulesBreadthFirst = (mod, settings, ancestorReplays, p) => {
    if (mod.replays) {
      const replays = mod.replays.handleRef ?? mod.replays // preserve reference -- which might not be equal to mod.replays if db is merged in module file -- this way files that import from a userland replays.js file will be the correct populated one after replayEvents, reload and hmr; also note: it's possible that the user defines replays directly on the module, in which case there will be no handleRef, but the user isn't counting on importing from replays.js since he didn't create one
      mod.replays.hasDb ??= !!mod.replays.db
      replays.db = mod.replays.db ?? ancestorReplays.db // inherit db from parent module's replays if child has replays but no db
      replays.settings = defaultCreateSettings(replays.config, settings)
      ancestorReplays = replays // inherit entire replays from parent if child doesn't have it
    }

    configsByPath[p] = ancestorReplays.config
    settingsByPath[p] = ancestorReplays.settings
    
    depthFirstCallbacks.unshift(finalizeReplay(mod, ancestorReplays, focusedModulePath, p, db, hmr, dbSession))
  
    for (const k of mod.moduleKeys) {
      if (k === 'replayTools') continue
      traverseAllModulesBreadthFirst(mod[k], settings?.[k], ancestorReplays, p ? `${p}.${k}` : k)
    }
  }

  traverseAllModulesBreadthFirst(topModule, settings, { config: {}, settings: {} }, '')
  depthFirstCallbacks.forEach(c => c(topState)) // depth-first so parent modules' createSeed function can operate on existing seeds from child modules

  return { configs: configsByPath, settings: settingsByPath }
}




const finalizeReplay = (mod, ancestorReplays, focusedModulePath, p, sharedDb, hmr, dbSession) => topState => { 
  if (mod.replays?.hasDb) { // only call for modules that have actual replays and therefore db/seed data
    ancestorReplays.db = createDbWithSeed(sharedDb, ancestorReplays, hmr, mod, dbSession, topState) // pass in replays containing pre-created settings with top-down inherited settings; assign to shared replays reference that will contain inherited settings
  }

  const state = stateForNormalizedPath(topState, focusedModulePath, p)
  if (!state) return // state is a module above the currently focused module

  state.respond.replays = ancestorReplays // now, by a sharing a reference, child modules who didn't have replays will have BOTH the correct top-down inherited settings + bottom-up merged db/seed
  Object.getPrototypeOf(state).replays = ancestorReplays
}


const createDbWithSeed = (sharedDb, replays, hmr, mod, dbSession, topState) => {
  const { db = {}, settings = {}, createSeed = defaultCreateSeed, ...options } = replays

  Object.defineProperty(db, 'replays', { enumerable: false, configurable: true, value: replays })
  Object.defineProperty(db, 'modulePath', { enumerable: false, configurable: true, value: mod.modulePath })

  if (!dbSession) {
    mergeDb(db, sharedDb, mod, topState)
    createSeed(settings, options, db)
  }
  else {
    mergeDbSession(db, mod, topState, dbSession, hmr)
  }

  return db
}



const mergeDbSession = (db, mod, topState, dbSession, hmr) => {
  const { modulePath } = mod
  const dbSessionModule = dbSession[modulePath]
  
  topState.__db ??= {}
  topState.__db[modulePath] ??= {}

  Object.keys(db).forEach(k => {
    const collection = db[k]

    topState.__db[modulePath][k] = hmr
      ? dbSessionModule[k] // prevState
      : reviveSeedDb(collection.Model, modulePath)(dbSessionModule[k])

    collection.docs = topState.__db[modulePath][k] // now docs is a proxy, that will update in the client proxy whenever the server db changes
  })
}


const mergeDb = (db, sharedDb, mod, topState) => {
  const { modulePath } = mod

  topState.__db ??= {}
  topState.__db[modulePath] ??= {}

  Object.keys(db).forEach(k => {
    const collection = db[k]
    if (collection.share === false) return

    const k2 = collection.shareKey ?? k

    collection.docs ??= sharedDb[k2]?.docs ?? {}
    topState.__db[modulePath][k2] = collection.docs

    collection.docs = topState.__db[modulePath][k2]

    sharedDb[k2] = collection
  })
}

// Collections with the same name will share `docs` object, and ancestor modules
// will receive collections created in child modules even if they don't themselves have it.

// This is to ensure docs sharing will jump over intermediary modules that don't require
// the given collection, and so by the end `state.replays.db` will contain all collections.




const stateForNormalizedPath = (topState, focusedModulePath = '', p) => {
  const isDescendentOrFocusedTop = p.indexOf(focusedModulePath) === 0
  if (!isDescendentOrFocusedTop) return // mod is ancestor of focused module (we needed only to traverse all the way back up to gather all settings, but there will be no state to assign state.respond.replays)

  const normalizedPath = stripPath(focusedModulePath, p)
  return topState.modulePaths[normalizedPath]
}




export const createModulePathsAll = (mod, paths = [], p = '') => {
  mod[isModule] = true
  mod.moduleKeys = []
  mod.modulePath = p

  paths.push(p)

  Object.keys(mod).forEach(k => {
    const v = mod[k]
    const isMod = v?.plugins && v.components && v.id

    if (isMod) {
      mod.moduleKeys.push(k)
      createModulePathsAll(v, paths, p ? `${p}.${k}` : k)
    }
  })

  return paths
}
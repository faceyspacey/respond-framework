import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'

import nestSettings from '../modules/replayTools/helpers/nestSettings.js'
import { nestAtModulePath, stateForNormalizedPath } from '../utils/sliceByModulePath.js'
import { isProd } from '../utils/bools.js'


export default (state, session, start = new Date) => {
  const { respond, replayTools } = state
  const { top, cookies } = respond
  const { replayState, __db: seed } = session

  const depth = []
  
  Object.assign(replayTools, createState(top, depth, replayState))
  replayState.settings ??= nestSettings(replayTools.settings) // tapping reload also creates this, but on first opening, we need to create it so you can save tests with the appropriate settings object (containing defaults) without having to tap reload
  
  state.__db ??= {}
  depth.forEach(finalize(state, seed)) // depth-first so parent modules' createSeed function can operate on existing seeds from child modules

  session.token = isProd ? cookies.get('token') : defaultCreateToken(respond.replays) // (top replays just asssigned in finalize) // const createToken = top.replays.createToken ?? defaultCreateToken
  delete session.__db
  
  console.log('createReplaySettings', new Date - start)
}



const createState = (top, depth, { focusedModulePath, settings: input }) => {
  const configs = {}
  const settings = {}

  const path = input?.module ?? focusedModulePath // settings with a module start higher than the focusedModulePath where they get their ancestor replays from
  const nested = nestAtModulePath(path, input) // input is provided starting at the given module, but we need to traverse from the top to gather possible parent replays
  
  createAllSettingsBreadth(top, nested, depth, configs, settings)

  return { configs, settings, focusedModulePath }
}


const createAllSettingsBreadth = (mod, input, depth, configs, settings, replays = { config: {}, settings: {} }) => {
  if (mod.db) {
    replays = mod.db.replays
    replays.db = mod.db
    replays.settings = defaultCreateSettings(replays.config, input)
  }
  else if (mod.replays) {
    mod.replays.db = replays.db // db inherited (but not replays)
    replays = mod.replays
    mod.replays.settings = defaultCreateSettings(mod.replays.config, input)
  }

  configs[mod.modulePath] = replays.config
  settings[mod.modulePath] = replays.settings // replays + db inherited if no mod.db/replays
  
  depth.unshift([mod, replays])

  for (const k of mod.moduleKeysUser) {
    createAllSettingsBreadth(mod[k], input?.[k], depth, configs, settings, replays)
  }
}



const finalize = (state, seed, shared = {}) => ([mod, replays]) => { 
  if (mod.db) { // only call for modules that have actual replays and therefore db/seed data
    replays.db = createDbWithSeed(state, seed, shared, replays, mod.modulePath) // pass in replays containing pre-created settings with top-down inherited settings; assign to shared replays reference that will contain inherited settings
  }

  const s = stateForNormalizedPath(state, mod.modulePath)

  if (s) { // if no state, then module is above currently focused one
    Object.getPrototypeOf(s).replays = s.respond.replays = replays // now, by a sharing a reference, child modules who didn't have replays will have BOTH the correct top-down inherited settings + bottom-up merged db/seed
  }
}


const createDbWithSeed = (state, seed, shared, replays, p) => {
  const { db = {}, settings = {}, createSeed = defaultCreateSeed, ...options } = replays

  state.__db[p] ??= {}

  Object.keys(db).forEach(k => mergeTable(state.__db[p], seed?.[p], shared, k, db[k], ))
  if (!seed) createSeed(settings, options, db)

  return db
}

const mergeTable = (state, seed, shared, key, table) => {
  if (table.share === false) return

  const k = table.shareKey ?? key
  const docs = shared[k]?.docs

  state[k] = seed
    ? docs ? Object.assign(docs, seed[k]) : seed[k] // seed[k] will contain the same docs, but we must link the object reference so they continue to update together
    : docs ?? {}

  table.docs = state[k] // now docs is a proxy, that will update in the client proxy whenever the server db changes
  shared[k] = table
}

// Collections with the same name will share `docs` object, and ancestor modules
// will receive collections created in child modules even if they don't themselves have it.

// This is to ensure docs sharing will jump over intermediary modules that don't require
// the given table, and so by the end `state.replays.db` will contain all collections.
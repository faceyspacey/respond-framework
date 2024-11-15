import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'

import nestSettings from '../modules/replayTools/helpers/nestSettings.js'
import { nestAtBranch } from '../utils/sliceBranch.js'
import { isProd } from '../utils/bools.js'


export default (state, session, start = new Date) => {
  const { respond, replayTools } = state
  const { top, cookies, branches } = respond
  const { replayState, __db: seed } = session

  const depth = []
  
  Object.assign(replayTools, createState(top, branches, depth, replayState))
  replayState.settings ??= nestSettings(replayTools.settings, branches) // tapping reload also creates this, but on first opening, we need to create it so you can save tests with the appropriate settings object (containing defaults) without having to tap reload
  
  state.__db ??= {}
  depth.forEach(createDbWithSeed(state, seed)) // depth-first so parent modules' createSeed function can operate on existing seeds from child modules

  session.token = isProd ? cookies.get('token') : defaultCreateToken(respond.replays) // (top replays just asssigned in finalize) // const createToken = top.replays.createToken ?? defaultCreateToken
  delete session.__db
  
  console.log('createReplaySettings', new Date - start)
}



const createState = (top, branches, depth, { focusedBranch, settings: input }) => {
  const configs = {}
  const settings = {}

  const branch = input?.branch ?? focusedBranch // settings with a module start higher than the focusedBranch where they get their ancestor replays from
  const nested = nestAtBranch(branch, input) // input is provided starting at the given module, but we need to traverse from the top to gather possible parent replays
  
  createAllSettingsBreadth(top, nested, branches, depth, configs, settings)

  return { configs, settings, focusedBranch }
}


const createAllSettingsBreadth = (mod, input, branches, depth, configs, settings, replays = { config: {}, settings: {} }) => {
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

  configs[mod.branch] = replays.config
  settings[mod.branch] = replays.settings // replays + db inherited if no mod.db/replays
  
  const state = branches[mod.branchRelative] // branch might be outside focused module tree
  if (state) state.respond.replays = replays // now, by a sharing a reference, child modules who didn't have replays will have BOTH the correct top-down inherited settings + bottom-up merged db/seed

  depth.unshift([mod, replays])

  for (const k of mod.moduleKeysUser) {
    input = input?.[k]
    if (input && (mod.db ||mod.replays) && replays[k])
    createAllSettingsBreadth(mod[k], input, branches, depth, configs, settings, replays)
  }
}



const createDbWithSeed = (state, seed, shared = {}) => ([mod, replays]) => {
  if (!mod.db) return // only modules that have actual replays and therefore db/seed data

  const b = mod.branch
  const { db = {}, settings = {}, createSeed = defaultCreateSeed, ...options } = replays

  state.__db[b] ??= {}

  Object.keys(db).forEach(k => mergeTable(state.__db[b], seed?.[b], shared, k, db[k], ))
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
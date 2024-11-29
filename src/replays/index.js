import defaultCreateSettings from './utils/createSettings.js'
import defaultCreateSeed from './utils/createSeed.js'
import defaultCreateToken from './utils/createToken.js'

import nestSettings from '../modules/replayTools/helpers/nestSettings.js'
import { nestAtBranch } from '../utils/sliceBranch.js'
import { isProd } from '../utils/bools.js'
import addModule from '../store/addModules.js'
import * as replayToolsModule from '../modules/replayTools/index.js'
import { snapDeepClone } from '../proxy/snapshot.js'


export default (state, session, start = performance.now()) => {
  const { respond } = state
  const { top, cookies, branches } = respond
  const { replayState, seed } = session

  const depth = []
  
  // const replayTools = replayState.status === 'hmr' ? Object.assign(Object.create({}), session.replayTools) : Object.assign(Object.create({}), createState(top, branches, depth, replayState)) // todo: caching by still calling createState if conf changed, and removing configs/settings from session.replayTools -- also HMR also needs replays assigned, so i guess we can't do this
  const replayTools = Object.assign(Object.create({}), createState(top, branches, depth, replayState))
  replayState.settings ??= nestSettings(replayTools.settings, branches) // tapping reload also creates this, but on first opening, we need to create it so you can save tests with the appropriate settings object (containing defaults) without having to tap reload
  
  const nextSeed = session.seed = {}
  depth.forEach(createDbWithSeed(nextSeed, seed)) // depth-first so parent modules' createSeed function can operate on existing seeds from child modules

  state.token = isProd ? cookies.get('token') : defaultCreateToken(respond.replays) // (top replays just asssigned in finalize) // const createToken = top.replays.createToken ?? defaultCreateToken
  
  console.log('createReplaySettings!!', performance.now() - start)
  
  if (top.db) {
    top.db.focusedBranch = replayTools.focusedBranch // so db can dynamically select focused module during development
  }

  addModule(respond, replayToolsModule, state, 'replayTools', replayTools)
  state.moduleKeys.push('replayTools')
}



const createState = (top, branches, depth, { branch, settings: input }) => {
  const configs = {}
  const settings = {}

  const focusedBranch = input?.branch ?? branch // settings with a module start higher than the branch where they get their ancestor replays from
  const nested = nestAtBranch(focusedBranch, input) // input is provided starting at the given module, but we need to traverse from the top to gather possible parent replays
  
  createAllSettingsBreadth(top, nested, branches, depth, configs, settings)

  return { configs, settings, focusedBranch }
}


const createAllSettingsBreadth = (mod, input, branches, depth, configs, settings, replays = { config: {}, settings: {} }) => {
  if (mod.db) {
    replays = mod.db.replays ?? mod.replays
    replays.db = mod.db
    replays.settings = defaultCreateSettings(replays.config, input)
    replays.config = snapDeepClone(replays.config)
  }
  else if (mod.replays) {
    mod.replays.db = replays.db // db inherited (but not replays)
    replays = mod.replays
    replays.settings = defaultCreateSettings(mod.replays.config, input)
    replays.config = snapDeepClone(replays.config)
  }

  configs[mod.branchAbsolute] = replays.config
  settings[mod.branchAbsolute] = replays.settings // replays + db inherited if no mod.db/replays
  
  const state = branches[mod.branch] // branch might be outside focused module tree
  if (state) Object.getPrototypeOf(state).replays = state.respond.replays = replays // now, by a sharing a reference, child modules who didn't have replays will have BOTH the correct top-down inherited settings + bottom-up merged db/seed

  depth.unshift([mod, replays])

  for (const k of mod.moduleKeys) {
    createAllSettingsBreadth(mod[k], input?.[k], branches, depth, configs, settings, replays)
  }
}



const createDbWithSeed = (nextSeed, seed, shared = {}) => ([mod, replays]) => {
  if (!mod.db) return // only modules that have actual replays and therefore db/seed data

  const b = mod.branchAbsolute
  const { db = {}, settings = {}, createSeed = defaultCreateSeed, ...options } = replays

  nextSeed[b] = {}

  db.tableNames.forEach(k => mergeTable(nextSeed[b], seed?.[b], shared, k, db[k]))
  if (!seed) createSeed(settings, options, db)
}

const mergeTable = (nextSeed, seed, shared, key, table) => {
  if (table.share === false) return

  const k = table.shareKey ?? key
  const docs = shared[k]?.docs

  table.docs = seed
    ? docs ? Object.assign(docs, seed[k]) : seed[k] // seed[k] will contain the same docs, but we must link the object reference so they continue to update together
    : docs ?? {}

  nextSeed[k] = table.docs
  shared[k] = table
}

// Collections with the same name will share `docs` object, and ancestor modules
// will receive collections created in child modules even if they don't themselves have it.

// This is to ensure docs sharing will jump over intermediary modules that don't require
// the given table, and so by the end `state.replays.db` will contain all collections.
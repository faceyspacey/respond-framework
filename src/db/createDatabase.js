import parentDefault from '../db/index.js'
import modelDefault from '../db/model.js'

import * as makeRequest from './helpers/makeRequest.js'
import { createModel } from './createModels.js'
import createSharedModels from './helpers/createSharedModels.js'
import { reviveServerModelInSpecificModule } from '../createModule/helpers/revive.js'
import userGetters from './helpers/userGetters.js'
import { isProd } from '../helpers/constants.js'
import createSettings from '../modules/replayTools/helpers/createSettings.js'


export default (options = {}) => {
  const { table: parent = parentDefault, parents, model = modelDefault, mixin, mixinModel = {}, tables = {}, models: m = {}, replays = {}, config = {}, ...modules } = options
  const db = { replays, tableNames: [], moduleKeys: [], models: {} }

  const base = { ...makeRequest, config, ...mixin }
  const models = createSharedModels(m)

  const descriptors = {
    db:      { enumerable: false, value: db },
    replays: { enumerable: false, value: replays }, 
  }

  if (isProd) {
    replays.settings = createSettings(replays.config)
  }

  const extra = Object.defineProperties(mixinModel, descriptors)

  db.revive = reviveServerModelInSpecificModule(db)

  for (const k in { ...tables, ...models }) { // there may be be virtual models, which need unused tables so we can do db.fooVirtual.create()
    createTable(k, db, base, parent, model, descriptors, tables, parents, models, extra)
  }

  for (const k in modules) {
    createChildModuleTables(k, modules[k], db, base, parent, model, descriptors, tables, parents, extra)
  }

  return db.original = db // when a module is focused during development, we may need to select original without props
}




const createTable = (k, db, base, parentDefault, model, descriptors, tables, parents = {}, models, extra) => {
  const table = tables[k]
  const Model = db.models[k] = createModel(k, model, models[k], extra)

  const parent = parents[k] ?? parentDefault

  db[k] = Object.assign(Object.create(parent), { _name: k, _namePlural: k + 's', ...base, ...table, parent, Model })

  Object.defineProperties(db[k], descriptors)
  Object.defineProperties(db[k], userGetters)

  db.tableNames.push(k)
}




const createChildModuleTables = (k, mod, db, base, model, descriptors, tables, extra) => {
  const { props = {}, ...child } = mod

  db[k] = child
  child.parent = db
  db.moduleKeys.push(k) // branch linked to child -- NOTE: this is different than how the client operates, as there will be a call to createDatabase per module on the server, and parent-to-child linking will happen for each call, rather than the whole tree recursively at once

  if (!props.tables) return

  const models = createSharedModels(props.models)
  
  for (const k2 in { ...props.tables, ...models }) {
    const propTable = props.tables[k2]
    let other

    if (propTable === tables[k2]) {  // original table same as in parent
      child[k2] = db[k2]             // assign fully created table
      child.models[k2] = child[k2].Model = db[k2].Model // assign fully created model
    }
    else if (other = Object.keys(tables).find(k3 => tables[k3] === propTable)) { // propTable is a name of another table
      child[k2] = db[other]
      child.models[k2] = child[k2].Model = db[other].Model
    }
    else {
      const parent = props.table ?? parent
      createTable(k2, child, base, parent, model, descriptors, props.tables, props.parents, models, extra)
    }
  }
}
import tableDefault from '../db/index.js'
import modelDefault from '../db/model.js'

import callMethod from './helpers/callMethod.js'
import { createModel } from './createModels.js'
import createSharedModels from './helpers/createSharedModels.js'
import { reviveServerModelInSpecificModule } from '../createModule/helpers/revive.js'



export default (options = {}) => {
  const { table = tableDefault, model = modelDefault, mixin, mixinModel = {}, tables = {}, models = {}, replays = {}, config = {}, ...modules } = options
  const db = { replays, tableNames: [], moduleKeys: [], models: {} }

  const base = { make, callMethod, config, ...table, ...mixin }
  const methods = createSharedModels(models)

  const descriptors = {
    db:      { enumerable: false, value: db },
    replays: { enumerable: false, value: replays }, 
  }

  const extra = Object.defineProperties(mixinModel, descriptors)

  db.revive = reviveServerModelInSpecificModule(db)

  for (const k in tables) {
    createTable(k, db, base, model, descriptors, tables, methods, extra)
  }

  for (const k in modules) {
    const { props, ...child } = modules[k]

    db[k] = child
    child.parent = db
    db.moduleKeys.push(k) // branch linked to child -- NOTE: this is different than how the client operates, as there will be a call to createDatabase per module on the server, and parent-to-child linking will happen for each call, rather than the whole tree recursively at once

    if (!props?.tables) continue

    const methods = createSharedModels(props.models)
    
    for (const k2 in props.tables) {
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
        createTable(k2, child, base, model, descriptors, props.tables, methods, extra)
      }
    }
  }

  return db.original = db // when a module is focused during development, we may need to select original without props
}




const createTable = (k, db, base, model, descriptors, tables, methods, extra) => {
  const table = tables[k]
  const Model = db.models[k] = createModel(k, model, methods[k], extra)

  db[k] = { _name: k, _namePlural: k + 's', ...base, ...table, Model }
  
  Object.defineProperties(db[k], descriptors)
  Object.defineProperties(db[k], userGetters)

  db.tableNames.push(k)
}





const userGetters = {
  user: {
    enumerable: false,
    get() {
      if (this._user) return this._user
      if (!this.req) throw new Error('respond: `this.user` can only be called in table methods when directly called by the client, or via other methods accesed within the same context via `this`')
      if (!this.identity) return null
      return this.db.user.findOne(this.identity.id).then(user => this._user = user)
    }
  },

  userSafe: {
    enumerable: false,
    get() {
      if (this._userSafe) return this._userSafe
      if (!this.req) throw new Error('respond: `this.userSafe` can only be called in table methods when directly called by the client, or via other methods accesed within the same context via `this`')
      if (!this.identity) return null
      return this.db.user.findOneSafe(this.identity.id).then(user => this._userSafe = user)
    }
  }
}



function make(doc) {
  doc = this.db.revive(doc)
  return new this.Model(doc)
}

// table.create must be defined by table or parent table, as they may have a custom way of dealing with creating IDs
import mixinDefault from '../db/index.js'
import call from './utils/call.js'
import safeMethods from './safeMethods.js'
import { createModel } from './createModels.js'


export default (options = {}) => {
  const { mixin = mixinDefault, model, tables = {}, models = {}, controllers = {}, replays = {}, config = {}, ...modules } = options
  const db = { replays, tableNames: [], moduleKeys: [], models: {} }

  const modelsShared = models.shared ?? {}
  const modelsServer = models.server ?? (!models.shared ? models : {})

  const descriptors = {
    db:      { enumerable: false, value: db },
    replays: { enumerable: false, value: replays }, 
  }

  const extra = Object.defineProperties({}, descriptors)

  descriptors.user = userDescriptor
  descriptors.userSafe = userSafeDescriptor

  for (const k in tables) {
    const coll = tables[k]
    const docs = db[k]?.docs // preserve docs through HMR

    const inherit = coll.inherit !== false

    const parent =      inherit ? mixin : {}
    const parentModel = inherit ? model : {}

    const Model = db.models[k] = createModel(k, modelsShared[k], modelsServer[k], parentModel, extra)

    db[k] = { _name: k, _namePlural: k + 's', make, call, ...safeMethods, ...parent, ...coll, docs, Model, config }

    Object.defineProperties(db[k], descriptors)

    db.tableNames.push(k)
  }

  // create tree of dbs
  Object.keys(modules).forEach(k => {
    if (!modules[k]) return // developer db undefined in production

    const { props = {}, ...child } = modules[k]
    const { db: dbChild, models } = child

    if (dbChild) Object.assign(child, db) // child is immutable
    if (models) child.models = Object.assign({}, child.models, models) // must be immutable since during development focusing a child branch will lead to using a child db without a parent having overwritten it through props

    db[k] = child
    child.original = modules[k] // when a module is focused during development, we may need to select original without props

    db.moduleKeys.push(k)
  })
  
  return db
}




const userDescriptor = {
  enumerable: false,
  get() {
    if (this._user) return this._user
    if (!this.req) throw new Error('respond: `this.user` can only be called in table methods when directly called by the client, or via other methods accesed within the same context via `this`')
    if (!this.identity) return null
    return this.db.user.findOne(this.identity.id).then(user => this._user = user)
  }
}

const userSafeDescriptor = {
  enumerable: false,
  get() {
    if (this._userSafe) return this._userSafe
    if (!this.req) throw new Error('respond: `this.userSafe` can only be called in table methods when directly called by the client, or via other methods accesed within the same context via `this`')
    if (!this.identity) return null
    return this.db.user.findOneSafe(this.identity.id).then(user => this._userSafe = user)
  }
}


function make(doc) {
  return new this.Model({ ...doc, __type: this._name })
}
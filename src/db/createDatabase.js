import createControllers from './createControllers.js'
import defaultCollection from '../db/index.js'
import { createModel } from './createModels.js'
import { isDev } from '../utils.js'


export default (options = {}) => {
  const { collection = defaultCollection, model, tables = {}, models = {}, controllers = {}, replays = {}, config = {}, createController, ...modules } = options
  const db = { replays, tableNames: [], moduleKeys: [], models: {} }

  const modelsShared = models.shared ?? {}
  const modelsServer = models.server ?? (!models.shared ? models : {})

  const descriptors = {
    db:      { enumerable: false, value: db },
    replays: { enumerable: false, value: replays },
  }

  db.controllers = createControllers(controllers, config, descriptors, createController)

  const extra = Object.defineProperties({}, descriptors)

  for (const k in tables) {
    const coll = tables[k]
    const docs = db[k]?.docs // preserve docs through HMR

    const inherit = coll.inherit !== false

    const parent =      inherit ? collection : {}
    const parentModel = inherit ? model : {}

    const Model = db.models[k] = createModel(k, modelsShared[k], modelsServer[k], parentModel, extra)
    const make = doc => new Model({ ...doc, __type: db[k]._name })

    db[k] = { _name: k, _namePlural: k + 's', make, ...parent, ...coll, docs, Model, db, config }

    Object.defineProperties(db[k], descriptors)

    db.tableNames.push(k)
  }

  Object.keys(modules).forEach(k => {
    if (!modules[k]) return // developer db undefined in production

    const { props = {}, ...child } = modules[k]
    const { db: dbChild, controllers, models } = child

    if (dbChild) Object.assign(child, db) // child is immutable
    if (controllers) child.controllers = Object.assign({}, child.controllers, controllers) // must be immutable since during development focusing a child branch will lead to using a child db without a parent having overwritten it through props
    if (models) child.models = Object.assign({}, child.models, models)

    db[k] = child
    child.original = modules[k] // when a module is focused during development, we may need to select original without props

    db.moduleKeys.push(k)
  })
  
  return db
}
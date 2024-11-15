import createControllers from './createControllers.js'
import { createModel } from './createModels.js'


export default (dbRaw, options = {}) => {
  const db = {}

  const { collection, model, controllers: conts = {}, replays = {}, models = {}, modules } = options
  const config = { listLimit: 10, ...options.config }

  const shared = models.shared ?? {}
  const server = models.server ?? (!models.shared ? models : {})

  const controllers = createControllers(conts, db, replays, options)

  const descriptors = {
    db: { enumerable: false, value: db },
    controllers: { enumerable: false, value: controllers },
    replays: { enumerable: false, value: replays },
  }

  Object.defineProperties(db, descriptors)

  const extra = Object.defineProperties({}, descriptors)

  for (const k in dbRaw) {
    const coll = dbRaw[k]
    const docs = db[k]?.docs // preserve docs through HMR

    const inherit = coll.inherit !== false

    const parent = inherit ? collection : {}
    const parentModel = inherit ? model : {}

    const Model = createModel(k, shared[k], server[k], parentModel, extra)
    const make = doc => new Model({ ...doc, __type: db[k]._name })

    db[k] = { _name: k, _namePlural: k + 's', make, ...parent, ...coll, docs, Model, db, config }

    Object.defineProperties(db[k], descriptors)
  }

  Object.assign(db, modules)
  
  return db
}
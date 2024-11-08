import { createModel } from './createModels.js'

export const db = {}


export default (dbRaw, options = {}) => {
  const { collection, model, models = {} } = options
  const config = { listLimit: 10, ...options.config }

  const shared = models.shared ?? {}
  const server = models.server ?? (!models.shared ? models : {})

  const descriptors = {
    db: { enumerable: false, configurable: true, value: db },
    replays: { enumerable: false, configurable: true, get: () => db.replays } // db.replays won't be defined until later by createReplays
  }

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

  return db
}
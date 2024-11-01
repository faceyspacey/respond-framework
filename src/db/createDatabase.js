import { createModel } from './createModels.js'

export const db = {}


export default (dbRaw, options = {}) => {
  const { collection, model, models = {} } = options
  const config = { listLimit: 10, ...options.config }

  const shared = models.shared ?? {}
  const server = models.server ?? (!models.shared ? models : {})


  for (const k in dbRaw) {
    const coll = dbRaw[k]
    const docs = db[k]?.docs // preserve docs through HMR

    const inherit = coll.inherit !== false

    const parent = inherit ? collection : {}
    const parentModel = inherit ? model : {}

    const Model = createModel(k, shared[k], server[k], parentModel, { db: getDb })
    const make = doc => new Model({ ...doc, __type: db[k]._name })

    db[k] = { _name: k, _namePlural: k + 's', make, ...parent, ...coll, docs, Model, db: getDb, config }

    Object.defineProperty(db[k], 'replays', { enumerable: false, configurable: true, get: () => db.replays })
  }

  return db
}


const getDb = name => name ? db[name] : db
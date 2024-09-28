import { createModel } from './createModels.js'

export const db = {}


export default (dbRaw, options = {}) => {
  const { collection, model, models = {} } = options
  const config = { listLimit: 10, ...options.config }

  const shared = models.shared ?? {}
  const server = models.server ?? !models.shared ? models : {}

  for (const k in dbRaw) {
    const coll = dbRaw[k]
    const docs = db[k]?.docs // preserve docs through HMR

    const inherit = coll.inherit !== false

    const parent = inherit ? collection : {}
    const parentModel = inherit ? model : {}

    const Model = createModel(k, shared[k], server[k], parentModel, { db: getDb })

    db[k] = { _name: k, _namePlural: k + 's', ...parent, ...coll, docs, Model, db: getDb, config }
  }

  return db
}


const getDb = name => name ? db[name] : db
export const db = {}


export default (dbRaw, options = {}) => {
  const { collection, model, models = {} } = options
  const config = { listLimit: 10, ...options.config }

  Object.keys(dbRaw).forEach(k => {
    const coll = dbRaw[k]
    const docs = db[k]?.docs // preserve docs through HMR

    const inherit = coll.inherit !== false

    const base = { _name: k, _namePlural: k + 's', db: getDb }
    const descriptors = createModelDescriptors(base, inherit ? model : {}, models.shared?.[k],  models.server?.[k])

    db[k] = { ...base, config, model: () => descriptors, ...(inherit ? collection : {}), ...coll, docs }
  })

  return db
}


const getDb = name => name ? db[name] : db

const gopd = Object.getOwnPropertyDescriptors

const createModelDescriptors = (base, model, shared = {}, server = {}) => {
  const model = Object.assign({}, gopd(base), gopd(model), gopd(shared), gopd(server))
  Object.keys(model).forEach(k => model[k].enumerable = false)
  return model
}
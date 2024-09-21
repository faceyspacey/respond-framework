export const db = {}


export default (dbRaw, options = {}) => {
  const { collection, model, models = {} } = options
  const config = { listLimit: 10, ...options.config }

  Object.keys(dbRaw).forEach(k => {
    const coll = dbRaw[k]
    const docs = db[k]?.docs // preserve docs through HMR

    const inherit = coll.inherit !== false

    const Class = function(doc) {
      if (!doc) return
      Object.defineProperties(this, g(doc)) // unlike Object.assign, this will allow assignment of instant properties of the same name as prototype getters without error
    }

    const base = { _name: k, _namePlural: k + 's', db: getDb, Class }
    const descriptors = createModelDescriptors(base, inherit ? model : {}, models.shared?.[k],  models.server?.[k])

    Object.defineProperty(Class, 'name', { value: k })
    Object.defineProperties(Class.prototype, descriptors)

    db[k] = { ...base, config, ...(inherit ? collection : {}), ...coll, docs }
  })

  return db
}


const getDb = name => name ? db[name] : db

const g = Object.getOwnPropertyDescriptors

const createModelDescriptors = (base, model, shared = {}, server = {}) =>
  Object.assign({}, g(base), g(model), g(shared), g(server))
export default (store, models, parent) => {
  if (!models) {
    if (parent.models) return parent.models
    models = store.findInClosestParent('models') ?? {}
  }

  const shared = models.shared ?? {}
  const client = models.client ?? !models.shared ? models : {}

  models = {}

  for (const k in { ...shared, ...client }) {
    models[k] = createModel(k, shared[k], client[k])
  }

  return models
}



export const createModel = (k, shared, client, parent, extra) => {
  const base = { _name: k, _namePlural: k + 's' }
  const descriptors = Object.assign(g(base), g(parent), g(shared), g(client), g(extra))

  Object.defineProperty(Model, 'name', { value: k })
  Object.defineProperties(Model.prototype, descriptors)

  function Model(doc) {
    if (!doc) return
    Object.defineProperties(this, g(doc)) // unlike Object.assign, this will allow assignment of instant properties of the same name as prototype getters without error
  }

  return Model
}


const g = obj => obj && Object.getOwnPropertyDescriptors(obj)
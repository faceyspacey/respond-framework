import mixin from './model.client.js'


export default (models, db, parent, respond, modulePath) => {
  if (!models) {
    if (parent.models) return parent.models
    models = respond.findInClosestAncestor('models', modulePath) ?? {}
  }

  const shared = models.shared ?? {}
  const client = models.client ?? (!models.shared ? models : {})

  models = {}

  for (const k in { ...shared, ...client }) {
    models[k] = createModel(k, shared[k], client[k], mixin, { db })
  }

  return respond.modelsByModulePath[modulePath] = models
}



export const createModel = (k, shared, serverOrClient, mixin, extra) => {
  const base = { _name: k, _namePlural: k + 's' }
  const descriptors = Object.assign(g(base), g(mixin), g(shared), g(serverOrClient), g(extra))

  Object.defineProperty(Model, 'name', { value: k })
  Object.defineProperties(Model.prototype, descriptors)

  function Model(doc, modulePath) {
    if (modulePath !== undefined) this.__modulePath = modulePath
    if (!doc) return
    Object.defineProperties(this, g(doc)) // unlike Object.assign, this will allow assignment of instant properties of the same name as prototype getters without error
  }

  return Model
}


const g = obj => obj && Object.getOwnPropertyDescriptors(obj)
import mixin from './model.client.js'


export default (models, db, parent, respond, branch) => {
  if (!models) {
    if (parent.models) return parent.models
    models = respond.findInClosestAncestor('models', branch) ?? {}
  }

  const shared = models.shared ?? {}
  const client = models.client ?? (!models.shared ? models : {})

  const extra = Object.defineProperties({}, {
    db: { enumerable: false, configurable: true, value: db },
    replays: { enumerable: false, configurable: true, get: () => respond.replays } // respond.replays won't be defined until later by createReplays
  })

  for (const k in { ...shared, ...client }) {
    db.models[k] = createModel(k, shared[k], client[k], mixin, extra)
  }

  return respond.modelsByBranch[branch] = db.models
}



export const createModel = (k, shared, serverOrClient, mixin, extra) => {
  const base = { _name: k, _namePlural: k + 's' }
  const descriptors = Object.assign(g(base), g(mixin), g(shared), g(serverOrClient), g(extra))

  Object.defineProperty(Model, 'name', { value: k })
  Object.defineProperties(Model.prototype, descriptors)

  function Model(doc, branch) {
    if (!doc) return
    Object.defineProperties(this, g(doc)) // unlike Object.assign, this will allow assignment of instance properties of the same name as prototype getters without error
    if (branch !== undefined) this.__branch = branch
  }

  return Model
}


const g = obj => obj && Object.getOwnPropertyDescriptors(obj)
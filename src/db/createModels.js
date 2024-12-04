import mixin from './model.client.js'
import { generateId } from '../utils/objectIdDevelopment.js'


export default ({ respond, mod, proto, parent, branch: branchRelative }) => {
  const branch = mod.branchAbsolute
  let { models } = mod

  if (!models) {
    if (parent.models) return respond.models = proto.models = parent.models
    models = respond.findInClosestAncestor('models', branchRelative) ?? {}
  }

  const { db } = respond

  const shared = Array.isArray(models) ? (models[0] ?? {}) : {}
  const client = Array.isArray(models) ? (models[1] ?? {}) : models

  const extra = Object.defineProperties({}, {
    db: { enumerable: false, configurable: true, value: db },
    replays: { enumerable: false, configurable: true, get: () => respond.replays } // respond.replays won't be defined until later by createReplays
  })

  const prevModels = window.state?.respond?.modelsByBranchType ?? {}
  const nextModels = {}

  for (const k in { ...shared, ...client }) {
    const key = branch + '_' + k
    const prevModel = prevModels[key]

    const Model = createModel(k, mixin, shared[k], client[k], extra, prevModel)
    respond.modelsByBranchType[key] = nextModels[k] = Model

    Model.make = doc => {
      const model = new Model(doc)
      model.__branchType = key
      return model
    }

    Model.create = doc => {
      const model = new Model(doc)
      model.__branchType = key
      mod.id = doc?.id || generateId()
      return model
    }
  }

  return respond.models = proto.models = nextModels
}



export const createModel = (k, mixin, shared, serverOrClient, extra, Model) => {
  const base = { _name: k, _namePlural: k + 's' }
  const descriptors = Object.assign(g(base), g(mixin), g(shared), g(serverOrClient), g(extra))

  Model ??= function Model(doc) {
    this.__type = k
    if (!doc) return
    Object.defineProperties(this, g(doc)) // unlike Object.assign, this will allow assignment of instance properties of the same name as prototype getters without error
  }

  Object.defineProperty(Model, 'name', { value: k })
  Object.defineProperties(Model.prototype, descriptors)

  return Model
}


const g = obj => obj && Object.getOwnPropertyDescriptors(obj)
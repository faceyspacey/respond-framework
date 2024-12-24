import mixin from './model.client.js'
import findClosestAncestorWith from '../createModule/helpers/findClosestAncestorWith.js'
import createSharedModels from './helpers/createSharedModels.js'


export default ({ respond, mod, proto, parent, branch: branchRelative }) => {
  let { models } = mod

  if (!models) {
    if (parent.models) return respond.models = proto.models = parent.models
    mod = findClosestAncestorWith('db', branchRelative, respond)
    models = mod.models ?? {} // db and models must be paired together on same module
  }

  const branch = mod.branchAbsolute

  const { db } = respond

  const methods = createSharedModels(models)

  const extra = Object.defineProperties({}, {
    db: { enumerable: false, configurable: true, value: db },
    replays: { enumerable: false, configurable: true, get: () => respond.replays } // respond.replays won't be defined until later by createReplays
  })

  const prevModels = window.state?.respond?.modelsByBranchType ?? {}
  const nextModels = {}

  for (const k in methods) {
    const key = branch + '_' + k
    const prevModel = prevModels[key]

    const Model = createModel(k, mixin, methods[k], extra, prevModel)
    respond.modelsByBranchType[key] = nextModels[k] = Model

    Model.make = doc => {
      const model = new Model(doc)
      model.__branchType = key
      return model
    }

    Model.create = doc => {
      const model = Model.make(doc)
      model.id = doc?.id ?? respond.generateId()
      return model
    }
  }

  return respond.models = proto.models = nextModels
}



export const createModel = (k, mixin, methods, extra, Model) => {
  const base = { _name: k, _namePlural: k + 's' }
  const descriptors = Object.assign(g(base), g(mixin), methods, g(extra))

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
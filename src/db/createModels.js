import mixin from './model.client.js'
import findClosestAncestorWith from '../createModule/helpers/findClosestAncestorWith.js'
import createSharedModels from './helpers/createSharedModels.js'
import { generateId } from '../helpers/deterministicCounter.js'


export default ({ respond, mod, proto, parent, branch: branchRelative }) => {
  let { models } = mod

  if (!models) {
    if (parent.models) return respond.models = proto.models = parent.models
    mod = findClosestAncestorWith('db', branchRelative, respond) // note: having a db defines the inherited ancestor when focusing a branch; therefore it's a requirement that models be paired with a db
    models = mod.models ?? {}
  }

  models = createSharedModels(models)

  const branch = mod.branchAbsolute
  const { db } = respond

  const extra = Object.defineProperties({}, {
    db: { enumerable: false, configurable: true, value: db },
    replays: { enumerable: false, configurable: true, get: () => respond.replays } // respond.replays won't be defined until later by createReplays
  })

  const prevModels = window.state?.respond?.modelsByBranchType ?? {}
  const nextModels = {}

  for (const k in models) {
    const key = branch + '_' + k
    const prevModel = prevModels[key]

    const Model = createModel(k, mixin, models[k], extra, prevModel)

    Model.create = doc => new Model(doc, true, key)
    Model.make = doc => new Model(doc, false, key)

    nextModels[k] = Model
    respond.modelsByBranchType[key] = Model
  }

  return respond.models = proto.models = nextModels
}



export const createModel = (k, mixin, methods, extra, Model) => {
  const base = { _name: k, _namePlural: k + 's' }
  const descriptors = Object.assign(g(base), methods, g(extra))

  Model ??= function Model(doc, genId = true, branchType) {
    if (doc) Object.defineProperties(this, g(doc)) // unlike Object.assign, this will allow assignment of instance properties of the same name as prototype getters without error
    if (branchType) this.__branchType = branchType
    if (genId) this.id ??= generateId()

    this.__type = k

    this.construct?.()
  }

  Object.defineProperty(Model, 'name', { value: k })

  const Parent = createParent(mixin)
  Model.prototype = new Parent
  
  Object.defineProperties(Model.prototype, descriptors)

  return Model
}


const g = obj => obj && Object.getOwnPropertyDescriptors(obj)

const createParent = mixin => {
  function Model() {}
  Object.defineProperties(Model.prototype, g(mixin))
  return Model
}
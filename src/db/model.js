import { ObjectId } from 'mongodb'
import { isProd } from '../helpers/constants.js'
import mock from './model.mock.js'
import { toObjectIds, toObjectIdsSelector } from './helpers/toFromObjectIds.js'
import cloneDeep from '../proxy/helpers/cloneDeep.js'


export default !isProd ? mock : {
  async save(moreDoc) {
    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    this.id ??= new ObjectId().toString()

    const { id, _id: _, ...doc } = this
    const selector = toObjectIdsSelector({ id: this.id })

    await this.db[this._name].mongo().updateOne(selector, { $set: toObjectIds(doc) }, { upsert: true })

    return this
  },

  async saveSafe(moreDoc) {
    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    const { id, _id: _, roles: __, ...doc } = this
    const selector = toObjectIdsSelector({ id: this.id })

    await this.db[this._name].mongo().updateOne(selector, { $set: toObjectIds(doc) }, { upsert: true })

    return this
  },

  clone() {
    return cloneDeep(this)
  },

  async remove() {
    const selector = toObjectIdsSelector({ id: this.id })
    await this.db[this._name].mongo().deleteOne(selector)
    return { id: this.id }
  },

  get super() {
    if (this._super) return this._super
    
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(this))

    const proxy = new Proxy({}, {
      get: (_, k) => proto[k].bind(this)
    }) 

    Object.defineProperty(this, '_super', { value: proxy, enumerable: false })

    return this._super
  },
}
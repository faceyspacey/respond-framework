import { isProd } from '../utils/bools.js'
import mock from './model.mock.js'
import { toObjectIds, toObjectIdsSelector } from './utils/toFromObjectIds.js'


export default !isProd ? mock : {
  async save(moreDoc) {
    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    const { id, _id: _, ...doc } = this
    const selector = toObjectIdsSelector({ id: this.id })

    await this.getDb()[this._name].collection.updateOne(selector, { $set: toObjectIds(doc) }, { upsert: true })

    return this
  },

  async remove() {
    const selector = toObjectIdsSelector({ id: this.id })
    await this.getDb()[this._name].collection.deleteOne(selector)
    return { id: this.id }
  }
}
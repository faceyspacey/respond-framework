import cloneDeep from '../proxy/helpers/cloneDeep.js'
import { generateId } from '../utils.js'


export default {
  async save(moreDoc) {
    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    const { docs } = this.db[this._name]

    this.id ??= generateId()

    const doc = docs[this.id] || {} // update || create
    docs[this.id] = Object.assign(doc, this) 

    return this
  },

  async saveSafe(moreDoc) {
    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    const { docs } = this.db[this._name]

    const doc = docs[this.id] || {} // update || create

    if (this.roles) {
      this.roles = doc.roles
    }

    docs[this.id] = Object.assign(doc, this) 

    return this
  },

  clone() {
    return cloneDeep(this)
  },

  async remove() {
    const { docs } = this.db[this._name]
    delete docs[this.id]
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
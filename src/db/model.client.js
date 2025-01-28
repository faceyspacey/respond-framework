import cloneDeep from '../proxy/helpers/cloneDeep.js'


export default {
  async save(moreDoc) {
    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    const res = await this.db[this._name].save(this)
    return res?.error ? res : { [this._name]: this } // preserve reference so reactivity sees it as the same object, and triggers less re-renders
  },

  async saveSafe(moreDoc) {
    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    const res = await this.db[this._name].saveSafe(this)
    return res?.error ? res : { [this._name]: this }
  },

  async remove() {
    const { id } = this
    return this.db[this._name].deleteOne({ id })
  },

  clone() {
    return cloneDeep(this)
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
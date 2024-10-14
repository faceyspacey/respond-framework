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
    return this.db[this._name].remove({ id })
  }
}
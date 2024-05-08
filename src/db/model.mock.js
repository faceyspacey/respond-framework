export default {
  async save(moreDoc) {
    this.updatedAt = new Date
    this.createdAt ??= this.updatedAt

    if (moreDoc) {
      Object.assign(this, moreDoc)
    }

    const { docs } = this.getDb()[this.collectionName]

    const doc = docs[this.id] || {} // update || create
    docs[this.id] = Object.assign(doc, this) 

    return this
  },

  async remove() {
    const { docs } = this.getDb()[this.collectionName]
    delete docs[this.id]
    return { id: this.id }
  }
}
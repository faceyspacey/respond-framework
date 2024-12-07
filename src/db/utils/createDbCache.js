export default (cache = {}) => ({
  cache,
  keygen: new Map,
  toJSON() {
    return this.cache
  },
  key({ args, userId }) {
    return userId ? `${JSON.stringify(args)}:${userId}` : JSON.stringify(args)
  },
  get(body) {
    const { branch, table, method } = body
    const k = this.key(body)

    this.keygen.set(body, k)                          // key generated once per request on cache.get (optimization)  

    return this.cache[branch]?.[table]?.[method]?.[k]
  },
  set(body, v) {
    const { branch, table, method } = body
    const k = this.keygen.get(body) ?? this.key(body) // key reused if already generated per request

    this.keygen.delete(body)

    this.cache[branch] ??= {}
    this.cache[branch][table] ??= {}
    this.cache[branch][table][method] ??= {}
    this.cache[branch][table][method][k] = v
  },
  clear(respond, { table, method, args, userId }) {
    const { branch } = respond
    
    if (table && method && args && userId) {
      const items = this.cache[branch]?.[table]?.[method] ?? {}
      const key = this.key({ args, userId })

      delete items[key]
    }
    else if (table && method && args) {
      const items = this.cache[branch]?.[table]?.[method] ?? {}
      const key = this.key({ args })

      Object.keys(items).forEach(k => {
        if (k.indexOf(key) === 0) delete items[k]
      })
    } 
    else if (table && method) {
      if (this.cache[branch][table]) {
        this.cache[branch][table][method] = {}
      }
    }
    else if (table) {
      this.cache[branch][table] = {}
    }
    else {
      this.cache[branch] = {}
    }
  }
})
export default (respond, cache) => ({
  keygen: new Map,

  key({ args, userId }) {
    return userId ? `${JSON.stringify(args)}:${userId}` : JSON.stringify(args)
  },

  has(body) {
    return this.get(body) !== undefined
  },
  
  get(body) {
    const { branch, table, method } = body
    const k = this.key(body)

    this.keygen.set(body, k)                          // key generated once per request on cache.get (optimization)  

    return cache[branch]?.[table]?.[method]?.[k]
  },

  set(body, v) {
    const { branch, table, method } = body
    const k = this.keygen.get(body) ?? this.key(body) // key reused if already generated per request

    this.keygen.delete(body)

    cache[branch] ??= {}
    cache[branch][table] ??= {}
    cache[branch][table][method] ??= {}
    cache[branch][table][method][k] = v
  },

  delete({ table, method, args, userId }) {
    const items = cache[branch]?.[table]?.[method] ?? {}
    const key = this.key({ args, userId })

    delete items[key]
  },

  clear({ table, method, args, userId }) {
    const { branch } = respond
    
    if (table && method && args && userId) {
      this.delete({ table, method, args, userId })
    }
    else if (table && method && args) {
      const items = cache[branch]?.[table]?.[method] ?? {}
      const key = this.key({ args })

      Object.keys(items).forEach(k => {
        if (k.indexOf(key) === 0) delete items[k]
      })
    } 
    else if (table && method) {
      if (cache[branch][table]) {
        cache[branch][table][method] = {}
      }
    }
    else if (table) {
      cache[branch][table] = {}
    }
    else {
      cache[branch] = {}
    }
  }
})
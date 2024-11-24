export default (state, k = 'dbCache') => {
  state[k] ??= {}

  return {
    get calls() {
      return state[k]
    },

    keygen: new Map,
    key({ args, userId }) {
      return userId ? `${JSON.stringify(args)}:${userId}` : JSON.stringify(args)
    },
    get(body) {
      const { table, method } = body
      const k = this.key(body)
  
      this.keygen.set(body, k)                          // key generated once per request on cache.get (optimization)  
  
      return this.calls[table]?.[method]?.[k]
    },
    set(body, v) {
      const { table, method } = body
      const k = this.keygen.get(body) ?? this.key(body) // key reused if already generated per request
  
      this.keygen.delete(body)
  
      this.calls[table] ??= {}
      this.calls[table][method] ??= {}
      this.calls[table][method][k] = v
    },
    clear({ table, method, args, userId }) {
      if (table && method && args && userId) {
        const items = this.calls[table]?.[method] ?? {}
        const key = this.key({ args, userId })
  
        delete items[key]
      }
      else if (table && method && args) {
        const items = this.calls[table]?.[method] ?? {}
        const key = this.key({ args })
  
        Object.keys(items).forEach(k => {
          if (k.indexOf(key) === 0) delete items[k]
        })
      } 
      else if (table && method) {
        if (this.calls[table]) {
          this.calls[table][method] = {}
        }
      }
      else if (table) {
        this.calls[table] = {}
      }
      else {
        this.calls = {}
      }
    }
  }
}
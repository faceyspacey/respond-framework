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
      const { controller, method } = body
      const k = this.key(body)
  
      this.keygen.set(body, k) // key generated once per request on cache.get (optimization)
  
      return this.calls[controller]?.[method]?.[k]
    },
    set(body, v) {
      const { controller, method } = body
      const k = this.keygen.get(body) ?? this.key(body)
  
      this.keygen.delete(body)
  
      this.calls[controller] ??= {}
      this.calls[controller][method] ??= {}
      this.calls[controller][method][k] = v
    },
    clear({ controller, method, args, userId }) {
      if (controller && method && args && userId) {
        const items = this.calls[controller]?.[method] ?? {}
        const key = this.key({ args, userId })
  
        delete items[key]
      }
      else if (controller && method && args) {
        const items = this.calls[controller]?.[method] ?? {}
        const key = this.key({ args })
  
        Object.keys(items).forEach(k => {
          if (k.indexOf(key) === 0) delete items[k]
        })
      } 
      else if (controller && method) {
        if (this.calls[controller]) {
          this.calls[controller][method] = {}
        }
      }
      else if (controller) {
        this.calls[controller] = {}
      }
      else {
        this.calls = {}
      }
    }
  }
}
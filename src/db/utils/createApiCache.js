import { replacer } from '../../utils/revive.js'


export default () => ({
  controllers: {},
  map: new Map,
  key({ args, userId }) {
    return userId
      ? `${JSON.stringify(args, replacer)}:${userId}`
      : `${JSON.stringify(args, replacer)}`
  },
  get(body) {
    const { controller, method } = body
    const k = this.key(body)

    this.map.set(body, k) // key generated once per request on cache.get (optimization)

    return this.controllers[controller]?.[method]?.[k]
  },
  set(body, v) {
    const { controller, method } = body
    const k = this.map.get(body) ?? this.key(body)

    this.map.delete(body)

    this.controllers[controller] ??= {}
    this.controllers[controller][method] ??= {}
    this.controllers[controller][method][k] = v
  },
  clear({ controller, method, args, userId }) {
    if (controller && method && args && userId) {
      const items = this.controllers[controller]?.[method] ?? {}
      const key = this.key({ args, userId })

      delete items[key]
    }
    else if (controller && method && args) {
      const items = this.controllers[controller]?.[method] ?? {}
      const key = this.key({ args })

      Object.keys(items).forEach(k => {
        if (k.indexOf(key) === 0) delete items[k]
      })
    } 
    else if (controller && method) {
      if (this.controllers[controller]) {
        this.controllers[controller][method] = {}
      }
    }
    else if (controller) {
      this.controllers[controller] = {}
    }
    else {
      this.controllers = {}
    }
  }
})
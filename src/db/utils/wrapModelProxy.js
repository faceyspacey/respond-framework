export default (name, doc, models, state) => {
  if (!doc) return
  
  const Model = models[name]

  if (!Model) return doc

  const proxy = new Proxy(doc, {
    get: (target, k, receiver) => {
      const descriptor = Object.getOwnPropertyDescriptor(Model, k)
      const getter = descriptor?.get

      if (getter) {
        return getter.call(proxy)
      }

      const method = Model[k]

      if (typeof method === 'function') {
        return (...args) => method.apply(proxy, args)
      }

      if (k === '_state') return state // escape hatch to access module state within class methods

      return Reflect.get(target, k, receiver)
    },
  })

  return proxy
}
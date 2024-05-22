export default (name, doc, models, state) => {
  if (!doc) return
  
  const model = models[name] // model is descriptors

  if (!model) return doc

  const proxy = new Proxy(doc, {
    get: (target, k) => callModelMethod(model, proxy, target, k),
  })

  return proxy
}


export const callModelMethod = (descriptors, proxy, target = {}, k) => {
  const v = target[k]
  if (v !== undefined) return v

  const descriptor = descriptors[k]
  const getter = descriptor?.get

  if (getter) {
    return getter.call(proxy)
  }

  const method = descriptor?.value

  if (typeof method === 'function') {
    return (...args) => method.apply(proxy, args)
  }

  if (k === '_state') return state // escape hatch to access module state within class methods
}
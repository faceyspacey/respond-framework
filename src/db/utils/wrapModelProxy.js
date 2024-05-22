export default (name, doc, models, state) => {
  if (!doc) return
  
  const model = models[name] // model is descriptors
  if (!model) return doc

  const proxy = new Proxy(doc, {
    get: (target, k) => callModelMethod(model, proxy, target, k, state),
  })

  return proxy
}


export const callModelMethod = (descriptors, proxy, doc = {}, k, state) => {
  const v = doc[k]
  if (v !== undefined) return v
  if (k === '_state') return state // escape hatch to access module state within class methods

  const { get, value: method } = descriptors[k] || {}
  return get?.call(proxy) ?? method?.bind(proxy)
}
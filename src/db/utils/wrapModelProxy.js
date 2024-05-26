export default (name, doc, models, state) => {
  if (!doc) return
  
  const descriptors = models[name] // model is descriptors
  if (!descriptors) return doc

  const get = callModelMethod.bind(null, descriptors, state)
  
  return new Proxy(doc, { get })
}


export const callModelMethod = (descriptors, state, target = {}, k, receiver) => {
  const v = target[k]
  if (v !== undefined) return v
  if (k === '_state') return state // escape hatch to access module state within class methods

  const { get, value: method } = descriptors[k] || {}

  if (get) {
    return get.call(receiver)
  }

  if (typeof method === 'function') {
    return method.bind(receiver)
  }

  return method // possible static value
}
export default (name, doc, state, traps) => {
  if (!doc) return
  
  const models = state.models || {}
  const descriptors = models[name] // model is descriptors

  if (!descriptors) return doc

  const get = callModelMethod.bind(null, descriptors, state)
  
  return new Proxy(doc, { get, ...traps })
}


export const callModelMethod = (descriptors, state, target = {}, k, receiver) => {
  const v = target[k]
  if (v !== undefined) return v
  if (k === '_state') return state // escape hatch to access module state within model methods

  const { get, value: method } = descriptors[k] || {}

  if (get) {
    return get.call(receiver)
  }

  if (typeof method === 'function') {
    return method.bind(receiver)
  }

  return method // possible static value
}
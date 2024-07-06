export default (name, doc, state, traps) => {
  return doc
  if (!doc) return
  
  const descriptors = state.models[name] // model is descriptors
  if (!descriptors) return doc

  const get = callModelMethod.bind(null, descriptors, state)
  return new Proxy(doc, { get, ...traps })
}


export const callModelMethod = (descriptors, state, target = {}, k, receiver) => {
  const v = target[k]
  if (k in target) return v           // default to value in doc

  if (k === '_state') return state    // escape hatch to access module state within model

  const { get, value } = descriptors[k] || {}

  if (get) {
    return get.call(receiver)         // getter
  }

  if (typeof value === 'function') {
    return value.bind(receiver)       // method
  }

  return value                        // static value
}
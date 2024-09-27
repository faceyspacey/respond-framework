export default (proto, selectors, propSelectors = {}, reducers, state) => {
  Object.keys(selectors).forEach(k => {
    const v = selectors[k]
    const kind = v.length === 0 ? 'get' : 'value'

    Object.defineProperty(proto, k, { [kind]: v, configurable: true })
  })

  Object.keys(propSelectors).forEach(k => {
    const v = propSelectors[k]
    const kind = v.length === 0 ? 'get' : 'value'

    const v2 = v.length === 0
      ? function() { return v.call(this._parent) }
      : function(...args) { return v.apply(this._parent, args) }

    Object.defineProperty(proto, k, { [kind]: v2, configurable: true })

    if (reducers[k]) reducers[k].__overridenByProp = true           // delete potential child reducer mock, so selector takes precedence
    delete state[k]                                                 // delete potential initialState too
  })
}
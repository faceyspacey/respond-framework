export const NO_SELECTOR = Symbol()


export default (k, receiver, selectors, parent) => {
  if (!selectors) return NO_SELECTOR
  if (k === 'models') return selectors.models

  const selectorProp = selectors.__props?.[k]

  if (typeof selectorProp === 'function') {
    const hasOnlyStateArg = selectorProp.length <= 1    // selectors that don't receive arguments can be used as getter, eg: state.selector

    return hasOnlyStateArg
      ? selectorProp(parent)                            // pass the prox itself so selectors can access other selectors
      : (...args) => selectorProp(parent, ...args)      // selectors that receive additional arguments are called as a function and CANNOT have default parameters, or the above selector.length check will fail, and no other solution is much better  
  }

  const selector = selectors[k]

  if (typeof selector === 'function') {
    const hasOnlyStateArg = selector.length <= 1        // selectors that don't receive arguments can be used as getter, eg: state.selector

    return hasOnlyStateArg
      ? selector(receiver)                              // pass the prox itself so selectors can access other selectors
      : (...args) => selector(receiver, ...args)        // selectors that receive additional arguments are called as a function and CANNOT have default parameters, or the above selector.length check will fail, and no other solution is much better  
  }

  return NO_SELECTOR
}
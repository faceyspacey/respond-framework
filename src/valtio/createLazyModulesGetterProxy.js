// WeakMaps
const proxyCache = new WeakMap()
const targetCache = new WeakMap()

// symbols
const GET_ORIGINAL_SYMBOL = Symbol()

// properties
const IS_TARGET_COPIED_PROPERTY = 'f'
const PROXY_PROPERTY = 'p'
const PROXY_CACHE_PROPERTY = 'c'
const TARGET_CACHE_PROPERTY = 't'

// function to create a new bare proxy
let newProxy = (target, handler) => new Proxy(target, handler)

// get object prototype
const getProto = Object.getPrototypeOf

const objectsToTrack = new WeakMap()

// check if obj is a plain object or an array
const isObjectToTrack = (obj) => (obj && (objectsToTrack.has(obj)
    ? objectsToTrack.get(obj)
    : (getProto(obj) === Object.prototype || getProto(obj) === Array.prototype)))

// Properties that are both non-configurable and non-writable will break
// the proxy get trap when we try to return a recursive/child compare proxy
// from them. We can avoid this by making a copy of the target object with
// all descriptors marked as configurable, see `copyTargetObject`.
// See: https://github.com/dai-shi/proxy-compare/pull/8
const needsToCopyTargetObject = (obj) => (Object.values(Object.getOwnPropertyDescriptors(obj)).some((descriptor) => !descriptor.configurable && !descriptor.writable))

// Make a copy with all descriptors marked as configurable.
const copyTargetObject = (obj) => {
    if (Array.isArray(obj)) {
        // Arrays need a special way to copy
        return Array.from(obj)
    }
    // For non-array objects, we create a new object keeping the prototype
    // with changing all configurable options (otherwise, proxies will complain)
    const descriptors = Object.getOwnPropertyDescriptors(obj)
    Object.values(descriptors).forEach((desc) => { desc.configurable = true })
    return Object.create(getProto(obj), descriptors)
}


const getOriginalObject = (obj) => (
    // unwrap proxy
    obj[GET_ORIGINAL_SYMBOL]
        // otherwise
        || obj
)


const sliceByModulePath = (obj, modulePath) => {
  if (!modulePath) return obj
  
  const modules = modulePath.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}


const createProxyHandler = (origObj, isTargetCopied, selectors, modulePaths, modulePath, parentReceiver) => {
  const state = {
      [IS_TARGET_COPIED_PROPERTY]: isTargetCopied,
  }

  const isValidModule = !!modulePaths[modulePath]
  const selectorsModule = isValidModule && sliceByModulePath(selectors, modulePath)

  const handler = {
      get(target, key, receiver) {
          if (key === GET_ORIGINAL_SYMBOL) {
              return origObj
          }

          if (selectorsModule) {
            if (key === 'models') {
              return selectorsModule[key]
            }

            const selectorProp = selectorsModule.__props?.[key]
            
            if (typeof selectorProp === 'function') {
              const hasOnlyStateArg = selectorProp.length <= 1            // selectors that don't receive arguments can be used as getter, eg: state.selector
        
              return hasOnlyStateArg
                ? selectorProp(parentReceiver)                            // pass the prox itself so selectors can access other selectors
                : (...args) => selectorProp(parentReceiver, ...args)      // selectors that receive additional arguments are called as a function and CANNOT have default parameters, or the above selector.length check will fail, and no other solution is much better  
            }

            
            const selector = selectorsModule[key]

            if (typeof selector === 'function') {
              const hasOnlyStateArg = selector.length <= 1    // selectors that don't receive arguments can be used as getter, eg: state.selector
        
              return hasOnlyStateArg
                ? selector(receiver)                          // pass the prox itself so selectors can access other selectors
                : (...args) => selector(receiver, ...args)    // selectors that receive additional arguments are called as a function and CANNOT have default parameters, or the above selector.length check will fail, and no other solution is much better  
            }
          }

          const path = typeof key === 'string'
            ? modulePath ? `${modulePath}.${key}` : key
            : modulePath
            
          return createProxy(Reflect.get(target, key), modulePaths, selectors, path, receiver)
      },
  }

  if (isTargetCopied) {
      handler.set = handler.deleteProperty = () => false
  }

  return [handler, state]
}





/**
 * Create a proxy.
 *
 * This function will create a proxy at top level and proxy nested objects as you access them,
 * in order to keep track of which properties were accessed via get/has proxy handlers:
 *
 * NOTE: Printing of WeakMap is hard to inspect and not very readable
 * for this purpose you can use the `affectedToPathList` helper.
 *
 * @param {object} obj - Object that will be wrapped on the proxy.
 * @returns {Proxy<object>} - Object wrapped in a proxy.
 *
 * @example
 * import { createProxy } from 'proxy-compare'
 *
 * const original = { a: "1", c: "2", d: { e: "3" } }
 * const affected = new WeakMap()
 * const proxy = createProxy(original, affected)
 *
 * proxy.a // Will mark as used and track its value.
 * // This will update the affected WeakMap with original as key
 * // and a Set with "a"
 *
 * proxy.d // Will mark "d" as accessed to track and proxy itself ({ e: "3" }).
 * // This will update the affected WeakMap with original as key
 * // and a Set with "d"
 */
const createProxy = (obj, modulePaths, selectors, modulePath = '', parentReceiver) => {
  if (!isObjectToTrack(obj)) return obj

  let targetAndCopied = (targetCache && targetCache.get(obj))

  if (!targetAndCopied) {
      const target = getOriginalObject(obj)

      if (needsToCopyTargetObject(target)) {
          targetAndCopied = [target, copyTargetObject(target)]
      }
      else {
          targetAndCopied = [target]
      }

      targetCache.set(obj, targetAndCopied)
  }

  const [target, copiedTarget] = targetAndCopied
  let handlerAndState = proxyCache?.get(target)

  if (!handlerAndState || handlerAndState[1][IS_TARGET_COPIED_PROPERTY] !== !!copiedTarget) {
      handlerAndState = createProxyHandler(target, !!copiedTarget, selectors, modulePaths, modulePath, parentReceiver)
      handlerAndState[1][PROXY_PROPERTY] = newProxy(copiedTarget || target, handlerAndState[0])

      proxyCache.set(target, handlerAndState)
  }

  return handlerAndState[1][PROXY_PROPERTY]
}


export default createProxy
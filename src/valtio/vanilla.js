import { getUntracked, markToTrack } from './proxy-compare.js'
import sliceByModulePath from '../utils/sliceByModulePath.js'


const isObject = (x) => typeof x === 'object' && x !== null

// shared state
const proxyStateMap = new WeakMap()

const refSet = new WeakSet()

const buildProxyFunction = (
  objectIs = Object.is,
  newProxy = (target, handler) => new Proxy(target, handler),
  canProxy = (x) => isObject(x) &&
    !refSet.has(x) &&
    (Array.isArray(x) || !(Symbol.iterator in x)) &&
    !(x instanceof WeakMap) &&
    !(x instanceof WeakSet) &&
    !(x instanceof Error) &&
    !(x instanceof Number) &&
    !(x instanceof Date) &&
    !(x instanceof String) &&
    !(x instanceof RegExp) &&
    !(x instanceof ArrayBuffer),
  defaultHandlePromise = (promise) => {
    switch (promise.status) {
        case 'fulfilled':
            return promise.value
        case 'rejected':
            throw promise.reason
        default:
            throw promise
    }
  },
  snapCache = new WeakMap(),
  createSnapshot = (target, version, handlePromise = defaultHandlePromise) => {
    const cache = snapCache.get(target)

    if (cache?.[0] === version) {
        return cache[1]
    }

    const snap = Array.isArray(target)
        ? []
        : Object.create(Object.getPrototypeOf(target))
        
    markToTrack(snap, true) // mark to track
    snapCache.set(target, [version, snap])

    Reflect.ownKeys(target).forEach((key) => {
        if (Object.getOwnPropertyDescriptor(snap, key)) return // Only the known case is Array.length so far.

        const value = Reflect.get(target, key)
        
        const desc = {
            value,
            enumerable: true,
            // This is intentional to avoid copying with proxy-compare.
            // It's still non-writable, so it avoids assigning a value.
            configurable: true,

            // respond-framework specific -- not sure if this will cause any problems based on the above comment, but let's try it
            writable: true,
        }

        if (refSet.has(value)) {
            markToTrack(value, false) // mark not to track
        }
        else if (value instanceof Promise) {
            delete desc.value
            desc.get = () => handlePromise(value)
        }
        else if (proxyStateMap.has(value)) {
            const [target, ensureVersion] = proxyStateMap.get(value)
            desc.value = createSnapshot(target, ensureVersion(), handlePromise)
        }

        Object.defineProperty(snap, key, desc)
    })

    return snap // Object.preventExtensions(snap)
  },
  proxyCache = new WeakMap(),
  versionHolder = [1, 1],
  proxyFunction = (initialObject, modulePaths, selectors, modulePath = '', parentReceiver) => {
    if (!isObject(initialObject)) {
        throw new Error('object required')
    }

    const found = proxyCache.get(initialObject)
    if (found) return found

    let version = versionHolder[0]

    const listeners = new Set()

    const notifyUpdate = (op, nextVersion = ++versionHolder[0]) => {
        if (version !== nextVersion) {
            version = nextVersion
            listeners.forEach((listener) => listener(op, nextVersion))
        }
    }

    let checkVersion = versionHolder[1]

    const ensureVersion = (nextCheckVersion = ++versionHolder[1]) => {
        if (checkVersion !== nextCheckVersion && !listeners.size) {
            checkVersion = nextCheckVersion

            propProxyStates.forEach(([propProxyState]) => {
                const propVersion = propProxyState[1](nextCheckVersion)
                if (propVersion > version) {
                    version = propVersion
                }
            })
        }

        return version
    }

    const createPropListener = (prop) => (op, nextVersion) => {
        const newOp = [...op]
        newOp[1] = [prop, ...newOp[1]]
        notifyUpdate(newOp, nextVersion)
    }

    const propProxyStates = new Map()

    const addPropListener = (prop, propProxyState) => {
        if (process.env.NODE_ENV !== 'production' && propProxyStates.has(prop)) {
            throw new Error('prop listener already exists')
        }

        if (listeners.size) {
            const remove = propProxyState[3](createPropListener(prop))
            propProxyStates.set(prop, [propProxyState, remove])
        }
        else {
            propProxyStates.set(prop, [propProxyState])
        }
    }

    const removePropListener = (prop) => {
        const entry = propProxyStates.get(prop)

        if (entry) {
            propProxyStates.delete(prop)
            entry[1]?.()
        }
    }

    const addListener = (listener) => {
        listeners.add(listener)
        if (listeners.size === 1) {
            propProxyStates.forEach(([propProxyState, prevRemove], prop) => {
                if (process.env.NODE_ENV !== 'production' && prevRemove) {
                    throw new Error('remove already exists')
                }

                const remove = propProxyState[3](createPropListener(prop))
                propProxyStates.set(prop, [propProxyState, remove])
            })
        }
        const removeListener = () => {
            listeners.delete(listener)
            if (listeners.size === 0) {
                propProxyStates.forEach(([propProxyState, remove], prop) => {
                    if (remove) {
                        remove()
                        propProxyStates.set(prop, [propProxyState])
                    }
                })
            }
        }
        return removeListener
    }

    const baseObject = Array.isArray(initialObject)
        ? []
        : Object.create(Object.getPrototypeOf(initialObject))

    const handler = {
        deleteProperty(target, prop) {
            const prevValue = Reflect.get(target, prop)

            removePropListener(prop)

            const deleted = Reflect.deleteProperty(target, prop)

            if (deleted) {
                notifyUpdate(['delete', [prop], prevValue])
            }

            return deleted
        },
        set(target, prop, value, receiver) {
            const hasPrevValue = Reflect.has(target, prop)
            const prevValue = Reflect.get(target, prop, receiver)

            if (hasPrevValue &&
                (objectIs(prevValue, value) ||
                    (proxyCache.has(value) &&
                        objectIs(prevValue, proxyCache.get(value))))) {
                return true
            }

            removePropListener(prop)

            if (isObject(value)) {
                value = getUntracked(value) || value
            }

            let nextValue = value

            if (value instanceof Promise) {
                value.then((v) => {
                  value.status = 'fulfilled'
                  value.value = v
                  notifyUpdate(['resolve', [prop], v])
                }).catch((e) => {
                  value.status = 'rejected'
                  value.reason = e
                  notifyUpdate(['reject', [prop], e])
                })
            }
            else {
                if (!proxyStateMap.has(value) && canProxy(value)) {
                    const path = modulePath ? `${modulePath}.${prop}` : prop
                    nextValue = proxyFunction(value, modulePaths, selectors, path, receiver)
                }

                const childProxyState = !refSet.has(nextValue) && proxyStateMap.get(nextValue)

                if (childProxyState) {
                    addPropListener(prop, childProxyState)
                }
            }

            Reflect.set(target, prop, nextValue, receiver)
            notifyUpdate(['set', [prop], value, prevValue])

            return true
        },
        get(target, key, receiver) {
            if (selectorsModule) {
                if (key === 'models') {
                    return selectorsModule.models
                }

                const selectorProp = selectorsModule.__props?.[key]

                if (typeof selectorProp === 'function') {
                    const hasOnlyStateArg = selectorProp.length <= 1                // selectors that don't receive arguments can be used as getter, eg: state.selector
            
                    return hasOnlyStateArg
                        ? selectorProp(parentReceiver)                              // pass the prox itself so selectors can access other selectors
                        : (...args) => selectorProp(parentReceiver, ...args)        // selectors that receive additional arguments are called as a function and CANNOT have default parameters, or the above selector.length check will fail, and no other solution is much better  
                }


                const selector = selectorsModule[key]
    
                if (typeof selector === 'function') {
                    const hasOnlyStateArg = selector.length <= 1                    // selectors that don't receive arguments can be used as getter, eg: state.selector

                    return hasOnlyStateArg
                        ? selector(receiver)                                        // pass the prox itself so selectors can access other selectors
                        : (...args) => selector(receiver, ...args)                  // selectors that receive additional arguments are called as a function and CANNOT have default parameters, or the above selector.length check will fail, and no other solution is much better  
                }
            }

            return Reflect.get(target, key, receiver)
        }
    }

    const isValidModule = !!modulePaths[modulePath]
    const selectorsModule = isValidModule && sliceByModulePath(selectors, modulePath)

    const proxyObject = newProxy(baseObject, handler)

    proxyCache.set(initialObject, proxyObject)

    const proxyState = [
        baseObject,
        ensureVersion,
        createSnapshot,
        addListener,
    ]

    proxyStateMap.set(proxyObject, proxyState)

    Reflect.ownKeys(initialObject).forEach((key) => {
        const desc = Object.getOwnPropertyDescriptor(initialObject, key)

        if ('value' in desc) {
            proxyObject[key] = initialObject[key]
            // We need to delete desc.value because we already set it,
            // and delete desc.writable because we want to write it again.
            delete desc.value
            delete desc.writable
        }
        Object.defineProperty(baseObject, key, desc)
    })
    
    return proxyObject
}) => [
    // public functions
    proxyFunction,
    // shared state
    proxyStateMap,
    refSet,
    // internal things
    objectIs,
    newProxy,
    canProxy,
    defaultHandlePromise,
    snapCache,
    createSnapshot,
    proxyCache,
    versionHolder,
]


// const [defaultProxyFunction] = buildProxyFunction()

export function proxy(initialObject = {}, modulePaths = {}, selectors = {}) {
    const [defaultProxyFunction] = buildProxyFunction() // move to here so weak maps aren't re-used between HMRs
    return defaultProxyFunction(initialObject, modulePaths, selectors)
}


export function getVersion(proxyObject) {
    const proxyState = proxyStateMap.get(proxyObject)
    return proxyState?.[1]()
}


export function subscribe(proxyObject, callback, notifyInSync) {
    const proxyState = proxyStateMap.get(proxyObject)

    if (process.env.NODE_ENV !== 'production' && !proxyState) {
        console.warn('Please use proxy object')
    }

    let promise

    const ops = []
    const addListener = proxyState[3]

    let isListenerActive = false

    const listener = (op) => {
        ops.push(op)

        if (notifyInSync) {
            callback(ops.splice(0))
            return
        }
        if (!promise) {
            promise = Promise.resolve().then(() => {
                promise = undefined
                if (isListenerActive) {
                    callback(ops.splice(0))
                }
            })
        }
    }

    const removeListener = addListener(listener)
    
    isListenerActive = true

    return () => {
        isListenerActive = false
        removeListener()
    }
}


export function snapshot(proxyObject, handlePromise) {
    const proxyState = proxyStateMap.get(proxyObject)

    if (process.env.NODE_ENV !== 'production' && !proxyState) {
        console.warn('Please use proxy object')
    }

    const [target, ensureVersion, createSnapshot] = proxyState
    return createSnapshot(target, ensureVersion(), handlePromise)
}


export function ref(obj) {
    refSet.add(obj)
    return obj
}


export const unstable_buildProxyFunction = buildProxyFunction

import isNamespace from '../utils/isNamespace.js'
import { stripModulePath } from '../utils/sliceByModulePath.js'


export const kinds = { navigation: 'navigation', submission: 'submission', done: 'done', error: 'error', cached: 'cached', data: 'data' }


export default function createEvents(store, state, cache, events = {}, propEvents = {}, modulePath, ns = '', nsObj, parentType) {
  const isBuiltIns = !!parentType
  
  const allEvents = isBuiltIns ? events : { edit, ...events }
  const keys = Object.keys({ ...allEvents, ...propEvents })

  const isModule = !ns && !isBuiltIns
  const start = isModule && (store.eventsByType.start ?? createEvent(store, state, cache, {}, modulePath, '', 'start')) // same start event reference on all modules
  
  const acc = Object.create(Namespace.prototype) // prevent from being reactive by using Namespace prototype, thereby preserving reference equality, as it's never made a proxy
  Object.assign(acc, start ? { start } : {})
  
  return keys.reduce((acc, k) => {
    const config = allEvents[k]
    const propConfig = propEvents[k]

    const eventOrNamespaceFromAncestor = cache.get(propConfig)

    if (eventOrNamespaceFromAncestor) {
      acc[k] = eventOrNamespaceFromAncestor
    }
    else if (isNamespace(propConfig ?? config, isBuiltIns)) {
      acc[k] = createEvents(store, state, cache, config, propConfig, modulePath, ns ? `${ns}.${k}` : k)
    }
    else if (propConfig) {
      acc[k] = createEvent(store, state, cache, propConfig, modulePath, ns, k, acc) // fresh event passed as prop
    }
    else if (config) {
      acc[k] = createEvent(store, state, cache, config, modulePath, ns, k, nsObj || acc, parentType)
    }

    if (config) cache.set(config, acc[k]) // even if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in cache.get(config)
      
    return acc
  }, acc)
}



const createEvent = (store, state, cache, config, modulePath, _namespace, _type, nsObj, parentType) => {
  const _typeResolved = parentType ? `${parentType}.${_type}` : _type 
    
  const namespace = modulePath
    ? _namespace ? `${modulePath}.${_namespace}` : modulePath
    : _namespace

  const type = namespace ? `${namespace}.${_typeResolved}` : _typeResolved

  const kind = parentType ? _type : config.path ? kinds.navigation : kinds.submission
  const info = { type, namespace, kind, _type: _typeResolved, _namespace, modulePath }

  const event = window.store?.eventsByType[type] ?? function event(arg = {}, meta = {}) { // preserve ref thru hmr/replace ?? note: event itself is a function
    const store = event.getStore()
    const e = { ...info, event, arg, meta }
    const dispatch = (a, m) => event.dispatch({ ...arg, ...a }, { ...meta, ...m })
    
    return applyTransform(store, e, dispatch)
  }

  Object.keys(event).forEach(k => delete event[k]) // dont preserve through HMR, in case deleted

  const builtIns = { done: config.done || {}, error: config.error || {}, cached: config.cached || {}, data: config.data || {} }
  const children = parentType ? {} : createEvents(store, state, cache, builtIns, undefined, modulePath, _namespace, nsObj, _type)

  const dispatch = (arg, meta) =>
    event.sync
      ? store.dispatchSync(event(arg, meta), meta)
      : store.dispatch(event(arg, meta), meta)

  Object.assign(event, config, info, { dispatch, getStore: store.getStore, is, in: includesThis, __event: true }, children)  // assign back event callback functions -- event is now a function with object props -- so you can do: events.post.update() + events.post.update.namespace etc
  Object.defineProperty(event, 'namespace', { value: nsObj, enumerable: false }) // tack on namespace ref for switchin thru in reducers like e.event (ie: e.event.namespace)
  Object.defineProperty(event, 'module', { get: () => store.getProxy(state), enumerable: false, configurable: true }) // same as namespace, except modules might be proxies, since reactivity isn't prevented by using prototypes as with Namespace
  delete event.type // can't have type string as it changes depending on what module is reducing the e object

  if (store.eventsByType[type]) {
    throw new Error(`respond: you cannot create an event namespace with the same name as an adjacent module: "${type}"`)
  }

  store.eventsByType[type] = event

  if (config.path) {
    store.eventsByPath[config.path] = event
  }

  if (config.__stateKey) {
    state[config.__stateKey] = event
    delete config.__stateKey
  }

  return event
}





const applyTransform = (store, e, dispatch) => {
  const { modulePathReduced, init } = store.ctx

  let payload = { ...e.arg }

  if (modulePathReduced) {
    e.type = stripModulePath(e.type, modulePathReduced)             // remove path prefix so e objects created in reducers are unaware of parent modules
    e.namespace = stripModulePath(e.namespace, modulePathReduced)   // eg 'grand.parent.child' => 'child'
  }

  if (e.event.transform) {
    const state = store.modulePaths[e.modulePath]
    payload = e.event.transform(state, e.arg, e.meta) || {}
  }

  const eFinal =  { ...e.arg, ...payload, ...e, payload, dispatch } // overwrite name clashes in payload, but also put here for convenience
  const isInit = init !== undefined && e.kind === 'navigation' // while init === false || true, tag the first navigation event with .init -- it's deleted on first successful navigation reducion with e.init, facilitating before redirects maintaining e.init

  return isInit ? { ...eFinal, init: true } : eFinal
}


const edit = {
  transform: ({}, form) => ({ form }),
  sync: true,
}



export function Namespace() {}

Namespace.prototype = { is, in: includesThis }

function is(namespaceOrEvent) {
  return namespaceOrEvent === this
}

function includesThis(...namespacesOrEvents) {
  return namespacesOrEvents.includes(this)
}
import isNamespace from '../utils/isNamespace.js'
import sliceByModulePath, { stripModulePath } from '../utils/sliceByModulePath.js'


const _symbol = Symbol.for('respondEvent')

const start = {}

const edit = {
  transform: ({}, form) => ({ form }),
  sync: true,
}



export default function createEvents(store, cache, events = {}, propEvents = {}, modulePath, ns = '', parentType) {
  const isBuiltIns = !!parentType
  const allEvents = isBuiltIns ? events : { start, edit, ...events }
  const keys = Object.keys({ ...allEvents, ...propEvents })

  return keys.reduce((acc, k) => {
    const config = allEvents[k]
    const propConfig = propEvents[k]

    const eventOrNamespaceFromAncestor = cache.get(propConfig)

    if (eventOrNamespaceFromAncestor) {
      acc[k] = eventOrNamespaceFromAncestor
    }
    else if (isNamespace(propConfig ?? config, isBuiltIns)) {
      acc[k] = createEvents(store, cache, config, propConfig, modulePath, ns ? `${ns}.${k}` : k)
    }
    else if (propConfig) {
      acc[k] = createEvent(store, cache, propConfig, modulePath, ns, k) // fresh event passed as prop
    }
    else if (config) {
      acc[k] = createEvent(store, cache, config, modulePath, ns, k, parentType)
    }

    if (config) cache.set(config, acc[k]) // even if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in cache.get(config)
      
    return acc
  }, {})
}



const createEvent = (store, cache, config, modulePath, _namespace, _type, parentType) => {
  const _typeResolved = parentType ? `${parentType}.${_type}` : _type 
    
  const namespace = modulePath
    ? _namespace ? `${modulePath}.${_namespace}` : modulePath
    : _namespace

  const type = namespace ? `${namespace}.${_typeResolved}` : _typeResolved

  const kind = parentType ? _type : config.path ? 'navigation' : 'submission'
  const info = { type, namespace, kind, _type: _typeResolved, _namespace, modulePath }

  const event = (arg = {}, meta = {}) =>  // event itself is a function
    applyTransform(
      store.getStore(),
      { ...info, event, arg, meta },
      (a, m) => dispatch({ ...arg, ...a }, { ...meta, ...m })
    )

  const builtIns = { done: config.done || {}, error: config.error || {}, cached: config.cached || {}, data: config.data || {} }
  const children = parentType ? {} : createEvents(store, cache, builtIns, undefined, modulePath, _namespace, _type)

  const dispatch = (arg, meta) => {
    const { dispatch: d, dispatchSync: ds } = store.getStore()
    const dispatch = event.sync ? ds : d
    return dispatch(event(arg, meta), meta)
  }

  Object.assign(event, config, info, { dispatch, _symbol }, children)  // assign back event callback functions -- event is now a function with object props -- so you can do: events.post.update() + events.post.update.namespace etc

  if (config.path) {
    store.eventsByPath[config.path] = event
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
    const storeModule = sliceByModulePath(store, e.modulePath)
    payload = e.event.transform(storeModule, e.arg, e.meta) || {}
  }

  const eFinal =  { ...e.arg, ...payload, ...e, payload, dispatch } // overwrite name clashes in payload, but also put here for convenience
  const isInit = init !== undefined && e.kind === 'navigation' // while init === false || true, tag the first navigation event with .init -- it's deleted on first successful navigation reducion with e.init, facilitating before redirects maintaining e.init

  return isInit ? { ...eFinal, init: true } : eFinal
}
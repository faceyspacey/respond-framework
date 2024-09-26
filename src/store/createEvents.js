import isNamespace from '../utils/isNamespace.js'
import sliceByModulePath, { stripModulePath } from '../utils/sliceByModulePath.js'


const _symbol = Symbol.for('respondEvent')

const start = {}

const edit = {
  transform: ({}, form) => ({ form }),
  sync: true,
}



export default (store, cache, mod, modulePath) =>
  mergeDeep(
    createEventsForModule(store, cache, mod.events ?? {}, modulePath),
    preparePropEvents(store, cache, mod.props?.events, mod.events, modulePath),
  )



const createEventsForModule = (store, cache, events, modulePath, ns = '', parentType) => {
  if (!events) return

  events = parentType ? events : { start, edit, ...events }

  return Object.keys(events).reduce((acc, k) => {
    const config = events[k]
    
    if (!config || typeof config !== 'object') return acc // could possibly be an undefined key by accident in userland

    acc[k] = !parentType && isNamespace(config)
      ? createEventsForModule(store, cache, config, modulePath, ns ? `${ns}.${k}` : k) // namespace
      : createEvent(store, cache, config, modulePath, ns, k, parentType)

    cache.set(config, acc[k])

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
  const children = parentType ? {} : createEventsForModule(store, cache, builtIns, modulePath, _namespace, _type)

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



const preparePropEvents = (store, cache, propEvents = {}, events = {}, modulePath, ns = '') =>
  Object.keys(propEvents).reduce((acc, k) => {
    const config = propEvents[k]
    const eventOrNamespaceFromAncestor = cache.get(config)

    if (eventOrNamespaceFromAncestor) {
      acc[k] = eventOrNamespaceFromAncestor
    }
    else if (isNamespace(config)) {
      acc[k] = preparePropEvents(store, cache, config, events[k], modulePath, ns ? `${ns}.${k}` : k)
    }
    else {
      acc[k] = createEvent(store, cache, config, modulePath, ns, k) // fresh event passed as prop
    }
    
    if (events[k]) {
      cache.set(events[k], acc[k]) // if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in cache.get(config)
    }

    return acc
  }, {})


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


const mergeDeep = (target, source) => {  
  Object.keys(source).forEach(k => {
    if (typeof target[k] !== 'object') { // non-existent namespace overwritten by namespace object prop or event function overriden by event function prop
      target[k] = source[k]
    }
    else {
      mergeDeep(target[k], source[k])
    }
  })

  return target
}

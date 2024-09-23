import isNamespace from '../utils/isNamespace.js'
import sliceByModulePath, { stripModulePath } from '../utils/sliceByModulePath.js'


const _symbol = Symbol.for('respondEvent')

const start = {}

const edit = {
  transform: ({}, form) => ({ form }),
  sync: true,
}



export default (mod, getStore, cache, p = '') => ({
  ...createEventsForModule({ start, edit, ...mod.events }, getStore, cache, p),
  ...preparePropEvents(mod.props?.events, mod.events, cache)
})



const preparePropEvents = (propEvents = {}, events = {}, cache) =>
  Object.keys(propEvents).reduce((acc, k) => {
    const config = propEvents[k]
    const eventOrNamespace = cache.get(config)

    if (eventOrNamespace) {
      acc[k] = eventOrNamespace
    }
    else if (isNamespace(config)) {
      acc[k] = preparePropEvents(config, events[k], cache)
    }
    else {
      throw new Error(`respond: event props must exist in parent`, k, config)
    }
    
    if (events[k]) {
      cache.set(events[k], acc[k]) // if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in cache.get(config)
    }

    return acc
  }, {})



const createEventsForModule = (events, getStore, cache, modulePath, _namespace = '', parentType) => {
  if (!events) return

  return Object.keys(events).reduce((acc, _type) => {
    const config = events[_type]
    if (!config || typeof config !== 'object') return acc // could possibly be an undefined key by accident in userland

    if (!parentType && isNamespace(config)) {
      const ns = _namespace ? `${_namespace}.${_type}` : _type
      const namespaceObject = createEventsForModule({ start, edit, ...config }, getStore, cache, modulePath, ns)

      acc[_type] = namespaceObject
      cache.set(config, namespaceObject)

      return acc
    }

    const _typeResolved = parentType ? `${parentType}.${_type}` : _type 
    
    const namespace = modulePath
      ? _namespace ? `${modulePath}.${_namespace}` : modulePath
      : _namespace

    const type = namespace ? `${namespace}.${_typeResolved}` : _typeResolved

    const kind = parentType ? _type : config.path ? 'navigation' : 'submission'
    const info = { type, namespace, kind, _type: _typeResolved, _namespace, modulePath }

    const event = (arg = {}, meta = {}) =>  // event itself is a function
      applyTransform(
        getStore(),
        { ...info, event, arg, meta },
        (a, m) => dispatch({ ...arg, ...a }, { ...meta, ...m })
      )

    const builtIns = { done: config.done || {}, error: config.error || {}, cached: config.cached || {}, data: config.data || {} }
    const children = parentType ? {} : createEventsForModule(builtIns, getStore, cache, modulePath, _namespace, _type)

    const dispatch = (arg, meta) => {
      const store = getStore()
      const dispatch = event.sync ? store.dispatchSync : store.dispatch
      return dispatch(event(arg, meta), meta)
    }

    Object.assign(event, config, info, { dispatch, _symbol }, children)  // assign back event callback functions -- event is now a function with object props -- so you can do: events.post.update() + events.post.update.namespace etc

    acc[_type] = event
    cache.set(config, event)

    return acc
  }, {})
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
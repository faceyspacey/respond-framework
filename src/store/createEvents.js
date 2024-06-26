import isNamespace from '../utils/isNamespace.js'
import { stripModulePath, sliceModule } from '../utils/sliceByModulePath.js'


export default (topModule, getStore) => {
  const events = createEvents(topModule, getStore)

  events.init = createInit(getStore)

  return events
}


const createInit = () => {
  const type = '@@INIT'
  const namespace = ''
  const modulePath = ''
  const kind = 'init'

  const info = { type, namespace, _type: type, _namespace: namespace, modulePath, kind }
  const init = () => ({ ...info, event: init, meta: { trigger: true } })
  
  const dispatch = () => getStore().dispatch(init())

  return Object.assign(init, info, { dispatch })
}


const createEvents = (mod, getStore, modulePath = '', parentEvents) => {
  const events = createEventsForModule({ edit, ...mod.events, ...mod.defaultProps?.events }, getStore, modulePath)

  return {
    ...events,
    ...mod.props?.events?.(parentEvents),
    ...recurseModules(mod, getStore, modulePath, events)
  }
}




const recurseModules = (mod, getStore, modulePath = '', parentEvents) => {
  if (!mod.modules) return

  return Object.keys(mod.modules).reduce((events, k) => {
    const child = mod.modules[k]
    const path = modulePath ? `${modulePath}.${k}` : k
    
    events[k] = createEvents(child, getStore, path, parentEvents)

    return events
  }, {})
}


const _symbol = Symbol.for('respondEvent')

const createEventsForModule = (events, getStore, modulePath, _namespace = '', parentType) => {
  if (!events) return

  return Object.keys(events).reduce((acc, _type) => {
    const config = events[_type]
    if (!config || typeof config !== 'object') return acc // could possibly be an undefined key by accident in userland

    if (!parentType && isNamespace(config)) {
      const ns = _namespace ? `${_namespace}.${_type}` : _type
      acc[_type] = createEventsForModule({ edit, ...config }, getStore, modulePath, ns)
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
    const children = parentType ? {} : createEventsForModule(builtIns, getStore, modulePath, _namespace, _type)

    const dispatch = (arg, meta) => {
      const store = getStore()
      const dispatch = event.sync ? store.dispatchSync : store.dispatch
      return dispatch(event(arg, meta), meta)
    }

    Object.assign(event, config, info, { dispatch, _symbol }, children)  // assign back event callback functions -- event is now a function with object props -- so you can do: events.post.update() + events.post.update.namespace etc

    acc[_type] = event
    return acc
  }, {})
}




const edit = {
  transform: ({}, form) => ({ form }),
  sync: true,
}


const applyTransform = (store, e, dispatch) => {
  const { modulePathReduced, init } = store.ctx

  let payload = { ...e.arg }
  const createDuringReduction = modulePathReduced?.length > 0

  if (createDuringReduction) {
    const pathPrefix = modulePathReduced.join('.') // eg: ['grand', 'parent'].join('.') == 'grand.parent'

    // remove path prefix so e objects created in reducers are unaware of parent modules
    e.type = stripModulePath(e.type, pathPrefix) // eg 'grand.parent.child' => 'child'
    e.namespace = stripModulePath(e.namespace, pathPrefix)
  }

  if (e.event.transform) {
    const storeModule = sliceModule(store, e.modulePath)
    payload = e.event.transform(storeModule, e.arg, e.meta) || {}
  }

  const eFinal =  { ...e.arg, ...payload, ...e, payload, dispatch } // overwrite name clashes in payload, but also put here for convenience
  const isInit = init !== undefined && e.kind === 'navigation' // while init === false || true, tag the first navigation event with .init -- it's deleted on first successful navigation reducion with e.init, facilitating before redirects maintaining e.init

  return isInit ? { ...eFinal, init: true } : eFinal
}
import isNamespace from '../utils/isNamespace.js'
import { stripPath } from '../utils/sliceByModulePath.js'


export const kinds = { init: 'init', navigation: 'navigation', submission: 'submission', done: 'done', error: 'error', data: 'data' }


export default function(proto, ...args) {
  proto.events = createEvents(...args)
}

function createEvents(respond, state, events = {}, propEvents = {}, modulePath, ns = '', nsObj, parentType) {
  const isBuiltIns = !!parentType
  
  const allEvents = isBuiltIns ? events : { edit, ...events }
  const keys = Object.keys({ ...allEvents, ...propEvents }).reverse() // navigation events can have the same path, and we want the first one's matched first -- this allows for a special pattern for search/query strings where multiple events share the same path, and the primary one is matched on first load, but you can dispatch different events that will have the same path but different queries

  const isModule = !ns && !isBuiltIns
  const init = isModule && (respond.eventsByType.init ?? createEvent(respond, state, { kind: 'init' }, modulePath, '', 'init')) // same init event reference on all modules
  
  const acc = Object.create(Namespace.prototype) // prevent from being reactive by using Namespace prototype, thereby preserving reference equality, as it's never made a proxy
  Object.assign(acc, init ? { init } : {})
  
  const cache = respond.eventsCache

  return keys.reduce((acc, k) => {
    const config = allEvents[k]
    const propConfig = propEvents[k]

    const eventOrNamespaceFromAncestor = cache.get(propConfig)

    if (eventOrNamespaceFromAncestor) {
      acc[k] = eventOrNamespaceFromAncestor
    }
    else if (isNamespace(propConfig ?? config, isBuiltIns)) {
      acc[k] = createEvents(respond, state, config, propConfig, modulePath, ns ? `${ns}.${k}` : k)
    }
    else if (propConfig) {
      acc[k] = createEvent(respond, state, propConfig, modulePath, ns, k, acc) // fresh event passed as prop
    }
    else if (config) {
      acc[k] = createEvent(respond, state, config, modulePath, ns, k, nsObj || acc, parentType)
    }

    if (config) cache.set(config, acc[k]) // even if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in eventsCache.get(config)
      
    return acc
  }, acc)
}



const createEvent = (respond, state, config, modulePath, _namespace, _type, nsObj, parentType) => {
  const isBuiltIn = !!parentType
  const _typeResolved = isBuiltIn ? `${parentType}.${_type}` : _type 
    
  const namespace = modulePath
    ? _namespace ? `${modulePath}.${_namespace}` : modulePath
    : _namespace

  const type = namespace ? `${namespace}.${_typeResolved}` : _typeResolved

  const kind = config.kind ?? (config.path ? kinds.navigation : kinds.submission)
  const info = { type, namespace, kind, _type: _typeResolved, _namespace, modulePath }

  const event = window.store?.eventsByType[type] ?? function event(arg = {}, meta = {}) { // preserve ref thru hmr/replays ?? note: event itself is a function
    if (arg.meta) {
      const { meta: m, ...rest } = arg
      meta = { ...m, ...meta }
      arg = rest
    }
    
    const e = { ...info, event, arg, meta }

    const dispatch = (a, m) => event.dispatch({ ...arg, ...a }, { ...meta, ...m })
    const trigger = (a, m) => dispatch(a, { ...m, trigger: true })

    return applyTransform(respond, e, dispatch, trigger)
  }

  Object.keys(event).forEach(k => delete event[k]) // dont preserve through HMR, in case deleted

  const children = !isBuiltIn && createEvents(respond, state, createBuiltIns(config), undefined, modulePath, _namespace, nsObj, _type)

  const dispatch = (arg, meta) => respond.dispatch(event(arg, meta), meta)

  const prefetch = config.fetch && (async (arg, meta) => {
    const e = event(arg, meta)
    const fetch = e.event.prefetch ?? e.event.fetch
    await fetch.call(e.event, state, e)
  })
  
  Object.assign(event, config, info, { dispatch, prefetch, is, in: includesThis, __event: true }, children)  // assign back event callback functions -- event is now a function with object props -- so you can do: events.post.update() + events.post.update.namespace etc
  Object.defineProperty(event, 'namespace', { value: nsObj, enumerable: false }) // tack on namespace ref for switchin thru in reducers like e.event (ie: e.event.namespace)
  Object.defineProperty(event, 'module', { value: state, enumerable: false, configurable: true }) // same as namespace, except modules might be proxies, since reactivity isn't prevented by using prototypes as with Namespace

  if (respond.eventsByType[type]) {
    throw new Error(`respond: you cannot create an event namespace with the same name as an adjacent module: "${type}"`)
  }

  respond.eventsByType[type] = event

  if (config.path) {
    const path = state.basenameFull ? `${state.basenameFull}${config.path}` : config.path
    respond.eventsByPath[path] = event
  }

  if (config.__stateKey) {
    state[config.__stateKey] = event
    delete config.__stateKey
  }

  return event
}



const createBuiltIns = ({ done, error, data }) => ({
  done:  assign({ kind: 'done'  }, done),
  error: assign({ kind: 'error' }, error),
  data:  assign({ kind: 'data' } , data)
})


const applyTransform = (respond, e, dispatch, trigger) => {
  const { modulePathReduced } = respond.ctx
  let payload = { ...e.arg }

  if (modulePathReduced) {
    e.type = stripPath(modulePathReduced, e.type)             // remove path prefix so e objects created in reducers are unaware of parent modules
    e.namespace = stripPath(modulePathReduced, e.namespace)   // eg: stripPath('parent', 'parent.child'): 'child'
  }

  if (e.event.transform) {
    payload = e.event.transform(e.event.module, e.arg, e) ?? {}
  }

  return { ...e.arg, ...payload, ...e, payload, dispatch, trigger } // overwrite name clashes in payload, but also put here for convenience 
}


const edit = {
  sync: true,
  transform: ({}, form) => ({ form }),
}



export function Namespace() {}

Namespace.prototype = { is, in: includesThis }

function is(namespaceOrEvent) {
  return namespaceOrEvent === this
}

function includesThis(...namespacesOrEvents) {
  return namespacesOrEvents.includes(this)
}


const assign = Object.assign
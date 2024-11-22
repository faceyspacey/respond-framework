import { is, thisIn } from '../utils/inIs.js'
import isNamespace from '../utils/isNamespace.js'
import { stripBranch } from '../utils/sliceBranch.js'
import { init, navigation, submission } from './kinds.js'


export default function(proto, ...args) {
  proto.events = createEvents(...args)
  extractedEvents.clear()
}

function createEvents(respond, state, events = {}, propEvents = {}, branch, ns = '', nsObj, parentType) {
  const isBuiltIns = !!parentType
  
  const allEvents = isBuiltIns ? events : { edit, ...events }
  const keys = Object.keys({ ...allEvents, ...propEvents }).reverse() // navigation events can have the same pattern, and we want the first one's matched first -- this allows for a special pattern for search/query strings where multiple events share the same pattern, and the primary one is matched on first load, but you can dispatch different events that will have the same pattern but different queries

  const isModule = !ns && !isBuiltIns
  const initEvent = isModule && (respond.eventsByType.init ?? createEvent(respond, state, { kind: init }, branch, '', init)) // same init event reference on all modules
  
  const acc = Object.create(Namespace.prototype) // prevent from being reactive by using Namespace prototype, thereby preserving reference equality, as it's never made a proxy
  if (initEvent) Object.assign(acc, { init: initEvent })
  
  const cache = respond.eventsCache

  return keys.reduce((acc, k) => {
    const config = allEvents[k]
    const propConfig = propEvents[k]

    const eventOrNamespaceFromAncestor = cache.get(propConfig)

    if (eventOrNamespaceFromAncestor) {
      acc[k] = eventOrNamespaceFromAncestor
    }
    else if (isNamespace(propConfig ?? config, isBuiltIns)) {
      acc[k] = createEvents(respond, state, config, propConfig, branch, ns ? `${ns}.${k}` : k)
    }
    else if (propConfig) {
      acc[k] = createEvent(respond, state, propConfig, branch, ns, k, acc) // fresh event passed as prop
    }
    else if (config) {
      acc[k] = createEvent(respond, state, config, branch, ns, k, nsObj || acc, parentType)
    }

    if (config) cache.set(config, acc[k]) // even if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in eventsCache.get(config)
      
    return acc
  }, acc)
}



const createEvent = (respond, state, config, branch, _namespace, _type, nsObj, parentType) => {
  const isBuiltIn = !!parentType
  const _typeResolved = isBuiltIn ? `${parentType}.${_type}` : _type 
    
  const namespace = branch
    ? _namespace ? `${branch}.${_namespace}` : branch
    : _namespace

  const type = namespace ? `${namespace}.${_typeResolved}` : _typeResolved

  const kind = config.kind ?? (config.pattern ? navigation : submission)
  const info = { type, namespace, kind, _type: _typeResolved, _namespace, branch }

  let event = window.state?.respond?.eventsByType[type] // optimization: preserve ref thru hmr + index changes in current replay so events stored in state are the correct references and cycles don't need to be wasted reviving them

  if (event) {
    Object.keys(event).forEach(k => delete event[k]) // dont preserve through HMR, in case deleted (eg a callback like event.submit was deleted and you expect it to not be to run when HMR replays last event)
  }

  event ??= function event(arg = {}, meta = {}) { // event itself is a function
    if (arg.meta) {
      const { meta: m, ...rest } = arg
      meta = { ...m, ...meta }
      arg = rest
    }
    
    const e = { ...info, event, arg, meta }

    const dispatch = (a, m) => event.dispatch({ ...arg, ...a }, { ...meta, ...m })
    const trigger = (a, m) => event.dispatch({ ...arg, ...a }, { ...meta, ...m, trigger: true })

    return applyTransform(respond, e, dispatch, trigger)
  }

  const children = !isBuiltIn && createEvents(respond, state, createBuiltIns(config), undefined, branch, _namespace, nsObj, _type)

  const dispatch = (arg, meta) => respond.dispatch(event(arg, meta))

  const prefetch = config.fetch && (async (arg, meta) => {
    const e = event(arg, meta)
    const fetch = e.event.prefetch ?? e.event.fetch
    await fetch.call(state, state, e)
  })

  const toJSON = () => ({ __event: true, type })
  
  Object.assign(event, config, info, { dispatch, prefetch, is, in: thisIn, toJSON, __event: true }, children)  // assign back event callback functions -- event is now a function with object props -- so you can do: events.post.update() + events.post.update.namespace etc
  Object.defineProperty(event, 'namespace', { value: nsObj, enumerable: false }) // tack on namespace ref for switchin thru in reducers like e.event (ie: e.event.namespace)
  Object.defineProperty(event, 'module', { get: () => branches[branch], enumerable: false, configurable: true }) // same as namespace, except modules might be proxies, since reactivity isn't prevented by using prototypes as with Namespace

  const { branches } = respond
  
  if (respond.eventsByType[type]) {
    throw new Error(`respond: you cannot create an event namespace with the same name as an adjacent module: "${type}"`) // same type could exist in both cases
  }

  respond.eventsByType[type] = event

  if (config.pattern) {
    const pattern = state.basenameFull ? `${state.basenameFull}${config.pattern}` : config.pattern
    respond.eventsByPattern[pattern] = event
  }

  if (extractedEvents.has(config)) {
    const key = extractedEvents.get(config)
    state[key] = event
  }

  return event
}


export const extractedEvents = new Map

const createBuiltIns = ({ done, error, data }) => ({
  done:  assign({ kind: 'done'  }, done),
  error: assign({ kind: 'error' }, error),
  data:  assign({ kind: 'data' } , data)
})


const applyTransform = (respond, e, dispatch, trigger) => {
  const { branchReduced } = respond.ctx
  let payload = { ...e.arg }

  if (branchReduced) {
    e.type = stripBranch(branchReduced, e.type)             // remove pattern prefix so e objects created in reducers are unaware of parent modules
    e.namespace = stripBranch(branchReduced, e.namespace)   // eg: stripBranch('parent', 'parent.child'): 'child'
  }

  if (e.event.transform) {
    const state = e.event.module
    payload = e.event.transform.call(state, state, e.arg, e) ?? {}
  }

  return { ...e.arg, ...payload, ...e, payload, dispatch, trigger } // overwrite name clashes in payload, but also put here for convenience 
}


const edit = {
  sync: true,
  transform: ({}, form) => ({ form }),
}



export function Namespace() {}

Namespace.prototype = { is, in: thisIn }




const assign = Object.assign
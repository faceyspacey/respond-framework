import isNamespace from '../utils/isNamespace.js'
import { init, navigation, submission, done, error, data } from './kinds.js'


export default (deps, events, propEvents) => {
  deps.respond.eventsByBranch[deps.branch] = {}

  deps.proto.events = createEvents(deps, events, propEvents)
  deps.proto.events.init = deps.respond.eventsByBranch[''].init ?? createEvent(deps, { kind: init }, init)

  extractedEvents.clear()
}


const createEvents = (deps, events = {}, propEvents = {}, namespace = '') => {
  const allEvents = { edit, ...events }
  const keys = Object.keys({ ...allEvents, ...propEvents }).reverse() // navigation events can have the same pattern, and we want the first one's matched first -- this allows for a special pattern for search/query strings where multiple events share the same pattern, and the primary one is matched on first load, but you can dispatch different events that will have the same pattern but different queries

  const cache = deps.respond.eventsCache
  const ns = new Namespace

  keys.forEach(name => {
    const config = allEvents[name]
    const propConfig = propEvents[name]

    const eventOrNamespaceFromAncestor = cache.get(propConfig)

    if (eventOrNamespaceFromAncestor) {
      ns[name] = eventOrNamespaceFromAncestor
    }
    else if (isNamespace(propConfig ?? config)) {
      ns[name] = createEvents(deps, config, propConfig, namespace ? `${namespace}.${name}` : name)
    }
    else if (propConfig) {
      ns[name] = createEvent(deps, propConfig, name, namespace, ns) // fresh event passed as prop
    }
    else if (config) {
      ns[name] = createEvent(deps, config, name, namespace, ns)
    }

    if (config) cache.set(config, ns[name]) // even if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in eventsCache.get(config)
  })

  return ns
}



const createEvent = (deps, config, name, namespace = '', ns) => {
  const { respond, branch, state } = deps

  const type = namespace ? `${namespace}.${name}` : name
  const event = respond.prev?.eventsByBranch[branch][type] ?? new Event // optimization: preserve ref thru hmr + index changes in current replay so events stored in state are the correct references and cycles don't need to be wasted reviving them

  event.construct(respond, config, branch, name, namespace, ns, type)

  respond.eventsByBranch[branch][type] = event

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



export class Namespace {
  is(namespace) {
    return this === namespace
  }

  in(...namespaces) {
    return namespaces.includes(this)
  }
}


class E {
  constructor(arg, meta, event) {
    mergArgs(arg, meta, this)

    if (event.transform) {
      const state = event.module
      this.payload = event.transform.call(state, state, arg, this) ?? { ...arg }
    }

    const { kind, name, _namespace: namespace } = event
    Object.assign(this, payload, { event, kind, name, namespace })
  }

  dispatch(arg, meta) {
    mergArgs(arg, meta, this) // 2nd chance to supply meta/arg
    return this.event.respond.dispatch(this)
  }

  trigger(arg, meta) {
    mergArgs(arg, meta, this) // 2nd chance to supply meta/arg
    return this.event.respond.trigger(this)
  }
}


const mergArgs = (arg, meta, e) => {
  if (arg) {
    if (arg.meta) {
      const { meta: m, ...rest } = arg
      meta = { ...m, ...meta }
      arg = rest
    }
  
    Object.assign(e, arg)

    if (e.arg) Object.assign(e.arg, arg)
    else e.arg = arg
  }
  else this.arg ??= {}

  e.meta = e.meta
    ? meta ? { ...e.meta, ...meta } : e.meta
    : meta ?? {}
}


const br = Symbol('branch')


class Event {
  construct(respond, config, branch, namespace, name, ns, type) {
    if (this.config) Object.keys(this.config).forEach(k => delete this[k]) // dont preserve through HMR, in case deleted (eg a callback like event.submit was deleted and you expect it to not be to run when HMR replays last event)
    Object.assign(this, config)

    this.config = config
    this.respond = respond
    this.name = name
    this.type = type

    this._namespace = namespace
    this.namespace = ns // e.event.namespace is object, and e.namespace will be string

    this[br] = branch
    this.kind ??= config.pattern ? navigation : submission
  }

  create(arg, meta) {
    if (arg?.__argName) arg = { [arg.__argName]: arg }
    return new E(arg, meta, this)
  }

  dispatch(arg, meta) {
    return this.respond.dispatch(this.create(arg, meta))
  }

  trigger(arg, meta) {
    return this.respond.trigger(this.create(arg, meta))
  }

  id(state) {
    if (!state) return this.type
    const { branch } = state.respond
    const b = stripBranchWithUnknownFallback(branch, this[br])
    return prependBranch(b, this.type)
  }

  prefetch(arg, meta) {
    return this.fetch?.call(this.module, this.module, this.create(arg, meta))
  }

  get module() {
    const branch = this[br]
    const state = this.respond.branches[branch]

    if (this.respond.ctx.rendered) {
      Object.defineProperty(this, 'module', { value: state }) // optimization: override getter once proxified
    }

    return state
  }

  is(event) {
    return this === event
  }

  in(...events) {
    return events.includes(this)
  }

  toJSON() {
    return { __event: true, type: this.type }
  }

  get done() {
    const value = createEvent(this.respond, { kind: done }, done, this._namespace, this.namespace) // lazy
    Object.defineProperty(this, done, { value }) // override proto getter, i.e. createEvent only once when first used
    return value
  }

  get error() {
    const value = createEvent(this.respond, { kind: error }, error, this._namespace, this.namespace)
    Object.defineProperty(this, error, { value })
    return value
  }

  get data() {
    const value = createEvent(this.respond, { kind: data }, data, this._namespace, this.namespace)
    Object.defineProperty(this, data, { value })
    return value
  }
}



export const extractedEvents = new Map




const edit = {
  sync: true,
  transform: ({}, form) => ({ form }),
}
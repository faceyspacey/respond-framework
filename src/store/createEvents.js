import isNamespace from '../utils/isNamespace.js'
import { prepend } from '../utils/sliceBranch.js'
import mergeArgMeta from './helpers/mergeArgMeta.js'
import { init, navigation, submission, done, error, data } from './kinds.js'
import { branch as branchSymbol } from './reserved.js'

export default (deps, events, propEvents) => {
  deps.proto.events = createEvents(deps, events, propEvents)
  deps.proto.events.init = deps.respond.eventsByType.init ?? createEvent(deps, { kind: init }, init)
  extractedEvents.clear()
}


const createEvents = (deps, events, propEvents, namespace = '') => {
  const evs = { edit, ...events }
  const keys = propEvents ? Object.keys({ ...evs, ...propEvents }) : Object.keys(evs)

  propEvents ??= {}

  const cache = deps.respond.eventsCache

  return keys.reduce((ns, name) => {
    const config = evs[name]
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
    return ns
  }, new Namespace)
}



const createEvent = (deps, config, name, _namespace = '', namespace) => {
  const { respond, branch, state } = deps

  const type = prepend(branch, prepend(_namespace, name))
  const event = respond.prev?.eventsByType[type] ?? new_Event() // optimization: preserve ref thru hmr + index changes in current replay so events stored in state are the correct references and cycles don't need to be wasted reviving them

  event.construct(branch, { config, name, _namespace, namespace, respond, type })

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


const new_Event = () => {
  const event = (arg, meta) => event.create(arg, meta)
  Object.setPrototypeOf(event, Event.prototype)
  Object.defineProperty(event, 'name', { writable: true })
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


class Event {
  construct(branch, props) {
    if (this.config) Object.keys(this.config).forEach(k => delete this[k]) // dont preserve through HMR, in case deleted (eg a callback like event.submit was deleted and you expect it to not be to run when HMR replays last event)
    
    Object.assign(this, props.config, props)

    this[branchSymbol] = branch
    this.typeLocal = prepend(this._namespace, this.name)
    this.kind ??= this.pattern ? navigation : submission
  }

  get done() {
    const value = createEvent(this.respond, { ...this.config.done, kind: done }, done, prepend(this._namespace, this.name), this.namespace) // lazy
    Object.defineProperty(this, done, { value }) // override proto getter, i.e. createEvent only once when first used
    return value
  }

  get error() {
    const value = createEvent(this.respond, { ...this.config.error, kind: error }, error, prepend(this._namespace, this.name), this.namespace)
    Object.defineProperty(this, error, { value })
    return value
  }

  get data() {
    const value = createEvent(this.respond, { ...this.config.data, kind: data }, data, prepend(this._namespace, this.name), this.namespace)
    Object.defineProperty(this, data, { value })
    return value
  }

  create(arg, meta) {
    if (arg?.__argName) arg = { [arg.__argName]: arg }
    return new e(arg, meta, this)
  }

  dispatch(arg, meta) {
    return this.respond.dispatch(this.create(arg, meta))
  }

  trigger(arg, meta) {
    return this.respond.trigger(this.create(arg, meta))
  }

  prefetch(arg, meta) {
    return this.fetch?.call(this.module, this.module, this.create(arg, meta))
  }

  id(state) {
    if (!state) return this.typeLocal
    const { branch } = state.respond
    const b = stripBranchWithUnknownFallback(branch, this[branchSymbol])
    return prepend(b, this.typeLocal)
  }

  get module() {
    const branch = this[branchSymbol]
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
}



export class e {
  constructor(arg, meta, event) {
    mergeArgMeta(arg, meta, this)

    this.payload = event.transform?.call(event.module, event.module, this.arg, this) ?? { ...this.arg }

    const { kind, name, _namespace: namespace } = event
    Object.assign(this, this.payload, { event, kind, name, namespace, __e: true })

    if (this.event.pattern) {
      this.meta.url = event.respond.fromEvent(this).url
    }
  }

  dispatch(arg, meta) {
    mergeArgMeta(arg, meta, this) // 2nd chance to supply meta/arg
    return this.event.respond.dispatch(this)
  }

  trigger(arg, meta) {
    mergeArgMeta(arg, meta, this) // 2nd chance to supply meta/arg
    return this.event.respond.trigger(this)
  }
}







export const extractedEvents = new Map

const edit = {
  sync: true,
  transform: ({}, form) => ({ form }),
}
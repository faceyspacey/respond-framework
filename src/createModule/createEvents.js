import isNamespace from '../utils/isNamespace.js'
import { prepend } from './helpers/sliceBranch.js'
import mergeArgMeta from './helpers/mergeArgMeta.js'
import kinds, { init, navigation, submission, done, error, data } from './kinds.js'
import { _branch, _parent } from './reserved.js'
import { stripBranchWithUnknownFallback } from './helpers/sliceBranch.js'
import { applyArgName } from './helpers/inferArgName.js'


export default (deps, events, propEvents) => {
  const { proto, respond } = deps

  proto.events = createEvents(respond, events, propEvents)
  proto.events.init = respond.eventsByType.init ?? createEvent(respond, { kind: init }, init, proto.events)
  
  extractedEvents.clear()
}


const createEvents = (respond, events, propEvents, namespace = new Namespace(respond)) => {
  const evs = { edit, ...events }
  const keys = propEvents ? Object.keys({ ...evs, ...propEvents }) : Object.keys(evs)

  propEvents ??= {}

  const cache = respond.eventsCache

  return keys.reduce((namespace, name) => {
    const config = evs[name]
    const propConfig = propEvents[name]

    const eventOrNamespaceFromAncestor = cache.get(propConfig)

    if (eventOrNamespaceFromAncestor) {
      namespace[name] = eventOrNamespaceFromAncestor
    }
    else if (isNamespace(propConfig ?? config)) {
      namespace[name] = createEvents(respond, config, propConfig, new Namespace(respond, prepend(namespace.name, name)))
    }
    else if (propConfig) {
      namespace[name] = createEvent(respond.state[_parent].respond, propConfig, name, namespace) // fresh event passed as prop
    }
    else if (config) {
      namespace[name] = createEvent(respond, config, name, namespace)
    }

    if (config && !cache.has(config)) cache.set(config, namespace[name]) // even if overriden by a prop, point original to fully created event -- facilitates grandparent props by way of original reference in eventsCache.get(config)
    
    return namespace
  }, namespace)
}



const createEvent = (respond, config, name, namespace) => {
  const { branch, state } = respond

  const type = prepend(branch, prepend(namespace.name, name))
  const event = respond.prevEventsByType[type] ?? new_Event() // optimization: preserve ref thru hmr + index changes in current replay so events stored in state are the correct references and cycles don't need to be wasted reviving them

  if (typeof config === 'function') config = { ...custom, custom: config }

  event.construct(branch, { config, name, namespace, respond, type })

  if (respond.eventsByType[type]) throw new Error(`respond: adjacent namespaces + modules can't share the same name: "${type}"`)
  respond.eventsByType[type] = event

  if (config.pattern) {
    const pattern = state.basenameFull ? `${state.basenameFull}${config.pattern}` : config.pattern
    respond.eventsByPattern[pattern] = event
  }

  if (extractedEvents.has(config)) {
    const key = extractedEvents.get(config)
    state[key] = event // assign event originally extracted from state.fooEvent back to its original key -- see extractModuleAspects.js where the inverse occurs and its assigned to state.events by the same name -- the goal is to have it available as state.fooEvent, but created here as part of the standard events creation process as if it existed on state.events.fooEvent
  }

  return event
}


const new_Event = () => { // like `new Event`, except the instance is a function instead of an object (so we can do events.foo()), and we set its prototype manually
  const event = (arg, meta) => event.create(arg, meta)
  Object.setPrototypeOf(event, Event.prototype)
  Object.defineProperty(event, 'name', { writable: true })
  return event
}



export class Namespace {
  constructor(respond, name = '') {
    this[_branch] = respond.branch
    this.name = name
  }

  is(namespace) {
    return this === namespace
  }

  in(...namespaces) {
    return namespaces.includes(this)
  }

  id(respondOrState) {
    if (respondOrState === undefined) return this.name
    const branch = respondOrState.respond?.branch ?? respondOrState.branch
    const b = stripBranchWithUnknownFallback(branch, this[_branch])
    return prepend(b, this.name)
  }
}


export class Event {
  construct(branch, props) {
    if (props.respond.hmr && this.config) {
      Object.keys(this.config).forEach(k => delete this[k]) // dont preserve through HMR, in case deleted (eg a callback like event.submit was deleted and you expect it to not be to run when HMR replays last event)
    }
    
    if (props.respond.reuseEvents) {
      delete this.done
      delete this.error
      delete this.data
      delete this.module
    }

    Object.assign(this, props.config, props)

    this[_branch] = branch
    this.kind ??= this.pattern ? navigation : submission
    this.sync ??= !!this.debounce
    this.moduleName = props.respond.moduleName
    this.__event = this.type
  }

  get done() {
    return this._once(done)
  }

  get error() {
    return this._once(error)
  }

  get data() {
    return this._once(data)
  }

  _once(kind) {
    const k = 'on' + kind[0].toUpperCase() + kind.slice(1)
    const config = { ...this.config[k], kind }
    const name = prepend(this.name, kind)
    const value = createEvent(this.respond, config, name, this.namespace) // lazy
    Object.defineProperty(this, kind, { value, configurable: true }) // override proto getter, i.e. createEvent only once when first used
    return value
  }

  create(arg, meta) {
    arg = applyArgName(arg)
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

  is(event) {
    return this === event
  }

  in(...events) {
    return events.includes(this)
  }

  toJSON() {
    return { __event: this.__event }
  }

  id(respondOrState) {
    const id = this._id ??= prepend(this.namespace.name, this.name)
    if (respondOrState === undefined) return id

    const branch = respondOrState.respond?.branch ?? respondOrState.branch
    const b = stripBranchWithUnknownFallback(branch, this[_branch])
    
    return prepend(b, id)
  }

  get module() {
    const branch = this[_branch]
    const state = this.respond.branches[branch]

    if (this.respond.mem.rendered) {
      Object.defineProperty(this, 'module', { value: state, configurable: true }) // optimization: override getter once proxified
    }

    return state
  }
}



export class e {
  constructor(arg, meta, event) {
    mergeArgMeta(arg, meta, this)

    const payload = event.transform?.call(event.module, event.module, this.arg, this) || { ...this.arg }

    Object.assign(this, payload)

    this.event = event
    this.kind = event.kind
    this.payload = payload

    this.__e = true

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

  create(arg, meta) {
    mergeArgMeta(arg, meta, this) // 2nd chance to supply meta/arg
    return this.event(this.arg, this.meta)
  }
}







export const extractedEvents = new Map

const edit = {
  kind: kinds.edit,
  sync: true,
}
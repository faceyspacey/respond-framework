import { Namespace } from '../../store/createEvents.js'


export const proxyStates = new WeakMap // shared state

export const equal = Object.is

export const isObject = x => typeof x === object && x

export const canProxy = x => typeof x === object && x && !x.____cantProxy

Date.prototype.____cantProxy = true
RegExp.prototype.____cantProxy = true
Namespace.prototype.____cantProxy = true

const object = 'object'

export const isOwnKeysChanged = (prev, next) => {
  const p = Reflect.ownKeys(prev)
  const n = Reflect.ownKeys(next)

  return p.length !== n.length || p.some((k, i) => k !== n[i])
}


export const recordUsage = (affected, trap, snap, k) => {
  let used = affected.get(snap)
  
  if (!used) {
    used = {}
    affected.set(snap, used)
  }

  let set = used[trap]

  if (!set) {
    set = new Set()
    used[trap] = set
  }

  set.add(k)
}
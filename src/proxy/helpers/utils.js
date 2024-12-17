import { Namespace, e } from '../../createModule/createEvents.js'


export const equal = Object.is
export const isArray = Array.isArray
export const keys = Object.keys
export const getProto = Object.getPrototypeOf
export const getOpd = Object.getOwnPropertyDescriptors
export const create = Object.create

export const isObj = x => typeof x === object && x

export const canProxy = x => typeof x === object && x && !x.____cantProxy

export const isOwnKeysChanged = (prev, next) => {
  const p = Reflect.ownKeys(prev)
  const n = Reflect.ownKeys(next)

  return p.length !== n.length || p.some((k, i) => k !== n[i])
}

e.prototype.____cantProxy = true
Date.prototype.____cantProxy = true
Error.prototype.____cantProxy = true
RegExp.prototype.____cantProxy = true
Promise.prototype.____cantProxy = true
Namespace.prototype.____cantProxy = true
ArrayBuffer.prototype.____cantProxy = true

const object = 'object'
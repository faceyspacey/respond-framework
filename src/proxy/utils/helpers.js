export const proxyStates = new WeakMap // shared state

export const GET_ORIGINAL_SYMBOL = Symbol()

export const getOriginalObject = obj => obj[GET_ORIGINAL_SYMBOL] || obj

export const isObject = x => typeof x === 'object' && x

export const canProxy = x => x &&
  (getProto(x) === objProto || getProto(x) === arrayProto)

export const isOwnKeysChanged = (prev, next) => {
  const p = Reflect.ownKeys(prev)
  const n = Reflect.ownKeys(next)

  return p.length !== n.length || p.some((k, i) => k !== n[i])
}


const getProto = Object.getPrototypeOf
const objProto = Object.prototype
const arrayProto = Array.prototype
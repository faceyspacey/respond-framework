export const proxyStates = new WeakMap // shared state

export const GET_ORIGINAL_SYMBOL = Symbol()

export const getOriginalObject = obj[GET_ORIGINAL_SYMBOL] || obj

export const isObject = x => typeof x === 'object' && x

export const canProxy = x => typeof x === 'object' && x &&
  !(x instanceof Date) && !(x instanceof RegExp)

export const isOwnKeysChanged = (prev, next) => {
  const p = Reflect.ownKeys(prev)
  const n = Reflect.ownKeys(next)

  return p.length !== n.length || p.some((k, i) => k !== n[i])
}
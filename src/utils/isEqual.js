import { memo as mem } from 'react'


export const isEqualDeep = (x, y)  => {
  const tx = typeof x
  const ty = typeof y

  return x && y && tx === obj && tx === ty

    ? ok(x).length === ok(y).length &&
        ok(x).every(k => isEqualDeep(x[k], y[k]))

    : x === y
}


const obj = 'object'
const ok = Object.keys




// isEqualDeepPartial(partialObject, completeObject)
// eg: isEqualDeepPartial({ foo: 123 }, { foo: 123, bar: 'baz' }) === true

export const isEqualDeepPartial = (x, y)  => {
  const tx = typeof x
  const ty = typeof y

  return x && y && tx === obj && tx === ty

    ? ok(x).every(k => isEqualDeepPartial(x[k], y[k]))

    : x === y
}


export const isEqualShallow = (x, y) =>
  x && y && typeof x === obj && typeof y === obj
    ? ok(x).length === ok(y).length && ok(x).every(k => x[k] === y[k])
    : x === y


const createArePropsEqual = (k = 'arg') => ({ [k]: prevArg, testProps: _, ...prev }, { [k]: nextArg, testProps: __, ...next }) =>
  isEqualShallow(prev, next) &&
  isEqualShallow(prevArg, nextArg)


export const memo = (Component, k) => mem(Component, createArePropsEqual(k))
import { compile } from 'path-to-regexp'
import { cleanLocation, urlToLocation } from './url.js'


const cache = {}

export default getStore => e => {
  const { basename = '' } = getStore().state

  if (typeof e === 'string') {
    const url = `${basename}${e}`
    return urlToLocation(url, getStore) // path or location object passed
  }

  if (e.pathname) {
    const url = `${basename}${e.pathname}`
    return urlToLocation(url, getStore) // path or location object passed
  }

  const { path } = e.event || {}
  if (!path) return null

  const toPath = cache[path] = cache[path] || compile(path)

  let url

  try {
    if (e.event.toLocation) {
      const loc = e.event.toLocation(getStore(), e)     // expected: { pathname: '/foo', query: { bar: 'baz}, hash='bla' } -- you can just return a query obj, and don't need to parse parse/prepare anything
      loc.pathname = `${basename}${loc.pathname}`
      return cleanLocation(loc, getStore)               // result:   { pathname: '/foo', search: 'bar=baz', hash='bla', url: '/foo?bar=baz#bla, query: { bar: 'baz} }
    }
    else {
      let pathname = toPath(e.arg, { encode: x => x })  // just pathname by default, eg: '/foo'
      pathname = `${basename}${pathname}`
      return { url: pathname, pathname, search: '', hash: '',  query: {} }
    }
  }
  catch (error) {
    throw new Error(`event.path "${path}" for event "${e.type}" received incompatible e.arg: ${e.arg ? JSON.stringify(e.arg) : 'undefined'}`)
  }
}
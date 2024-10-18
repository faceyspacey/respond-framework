import { compile } from 'path-to-regexp'
import { cleanLocation, urlToLocation } from '../../utils/url.js'


const cache = {}

export default function(e) {
  const { state } = this.respond
  const { basename = '' } = state

  if (typeof e === 'string') {
    const url = `${basename}${e}`
    return urlToLocation(url, state) // path or location object passed
  }

  if (e.pathname) {
    const url = `${basename}${e.pathname}`
    return urlToLocation(url, state) // path or location object passed
  }

  const { path } = e.event || {}
  if (!path) return null

  const toPath = cache[path] = cache[path] || compile(path)

  try {
    if (e.event.toLocation) {
      const loc = e.event.toLocation(state, e)     // expected: { pathname: '/foo', query: { bar: 'baz}, hash='bla' } -- you can just return a query obj, and don't need to parse parse/prepare anything
      loc.pathname = `${basename}${loc.pathname}`
      return cleanLocation(loc, state)               // result:   { pathname: '/foo', search: 'bar=baz', hash='bla', url: '/foo?bar=baz#bla, query: { bar: 'baz} }
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
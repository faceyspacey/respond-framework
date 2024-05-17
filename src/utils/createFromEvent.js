import { compile } from 'path-to-regexp'
import { cleanLocation, urlToLocation } from './url.js'


const cache = {}

export default getStore => e => {
  const { path } = e.event || {}
  if (!path) return null

  const toPath = cache[path] = cache[path] || compile(path)
  const { basename = '' } = getStore().state

  let url

  try {
    if (e.event.toLocation) {
      const loc = e.event.toLocation(getStore(), e)     // expected: { pathname: '/foo', query: { bar: 'baz}, hash='bla' } -- you can just return a query obj, and don't need to parse parse/prepare anything
      url = cleanLocation(loc).url                      // result:   { pathname: '/foo', search: 'bar=baz', hash='bla', url: '/foo?bar=baz#bla, query: { bar: 'baz} }
    }
    else {
      url = toPath(e.arg, { encode: x => x })           // just pathname by default, eg: '/foo'
    }

    url = `${basename}${url}`
    return urlToLocation(url, getStore)                 // return: { pathname: '/basename/foo', search: 'bar=baz', hash='bla', url: '/basename/foo?bar=baz#bla, query: { bar: 'baz}
  }
  catch (error) {
    throw new Error(`event.path "${path}" for event "${e.type}" received incompatible e.arg`)
  }
}
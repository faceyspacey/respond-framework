import { compile } from 'path-to-regexp'
import { cleanSearchHash, userLocationToRespondLocation } from '../../utils/url.js'


const cache = {}

export default function(e, basename = e.event.module.basename ?? '') {
  const { path } = e.event ?? {}
  if (!path) return null

  const { event } = e
  const state = event.module

  try {
    if (event.locationFrom) {
      const loc = event.locationFrom(state, e)                      // expected: { query: { bar: 'baz' }, hash='bla' } -- you can just return a query obj, and don't need to parse parse/prepare anything
      const toPath = cache[path] = cache[path] || compile(path)
      loc.pathname ??= toPath(e.arg, { encode: x => x })  
      loc.pathname = `${basename}${loc.pathname}`
      return userLocationToRespondLocation(loc, state, basename)  // result:   { pathname: '/foo', search: 'bar=baz', hash='bla', url: '/foo?bar=baz#bla, query: { bar: 'baz' } }
    }
    else if (event.locationFromCustom) {
      const { pathname: p, query = {}, ...loc } = event.locationFromCustom(state, e)
      const { search, hash } = cleanSearchHash(loc)
      const pathname = `${basename}${p}`
      const relativeUrl = `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`
      return { relativeUrl, pathname, search, hash, query }
    }
    else {
      const toPath = cache[path] = cache[path] || compile(path)
      const p = toPath(e.arg, { encode: x => x })  // just pathname by default, eg: '/foo'
      const pathname = `${basename}${p}`
      return { relativeUrl: pathname, pathname, search: '', hash: '', query: {} }
    }
  }
  catch (error) {
    console.error(error)
    throw new Error(`event.path "${path}" for event "${e.type}" received incompatible e.arg: ${e.arg ? JSON.stringify(e.arg) : 'undefined'}`)
  }
}
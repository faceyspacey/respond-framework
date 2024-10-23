import { isNative } from './bools.js'
import { parseSearch, stringifyQuery } from './searchQuery.js'
import defaultOrigin from './constants.js'


export const locationToRespondLocation = (loc = {}, state = {}) => {     // input: { pathname: '/foo', search: '?bar=baz', hash='#bla' }
  const { pathname, search: s, hash: h } = loc
  
  const hash = h?.charAt(0) === '#' ? h.substr(1) : h || ''
  const search = s?.charAt(0) === '?' ? s.substr(1) : s || ''

  const query = search ? parseSearch(search, state) : {}

  const relativeUrl = `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`

  return { relativeUrl, pathname, search, hash, query }                   // output: { pathname: '/foo', query: { bar: 'baz' }, hash='bla', search: 'bar=baz', relativeUrl: '/foo?bar=baz#bla, }
}


export const userLocationToRespondLocation = (loc = {}, state = {}) => {  // input: { pathname: '/foo', query: { bar: 'baz' }, hash='bla' }
  const { pathname = '/', query, hash: h } = loc
  
  const hash = h?.charAt(0) === '#' ? h.substr(1) : h || ''
  const search = query ? stringifyQuery(query, state, '') : ''

  const relativeUrl = `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`

  return { relativeUrl, pathname, search, hash, query }                   // output: { pathname: '/foo', query: { bar: 'baz' }, hash='bla', search: 'bar=baz', relativeUrl: '/foo?bar=baz#bla, }
}




export const cleanSearchHash = ({ search: s, hash: h, ...rest }) => ({
  ...rest,
  search: s?.charAt(0) === '?' ? s.substr(1) : s || '',
  hash: h?.charAt(0) === '#' ? h.substr(1) : h || ''
})




// helper to conform to our location requirements of { pathname, search, hash } on all platforms

export const urlToLocation = url => {
  if (typeof url === 'object') return url
  if (!isNative) return new URL(defaultOrigin + url) // RN historically has had problems with the URL class -- todo: replace when no longer an issue

  let pathname = url.replace(/^.*\/\/[^/?#]+/, '') // remove possible domain
  let search = ''
  let hash = ''

  const hashIndex = pathname.lastIndexOf('#')

  if (hashIndex !== -1) {
    hash = pathname.substr(hashIndex + 1)
    pathname = pathname.substr(0, hashIndex)
  }

  const searchIndex = pathname.indexOf('?')

  if (searchIndex !== -1) {
    search = pathname.substr(searchIndex + 1)
    pathname = pathname.substr(0, searchIndex)
  }

  if (pathname.charAt(0) !== '/') {
    pathname = '/' + pathname
  }

  return { pathname, search, hash } // downstream all we uses is these to create RespondLocations
}
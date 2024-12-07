import { parseSearch, stringifyQuery } from './searchQuery.js'
import { stripPermalink } from '../modules/replayTools/helpers/createPermalink.js'


export const searchHashToQueryHash = ({ search, hash: h } = {}, state = {}) => {     // input: { search: '?bar=baz', hash='#bla' }
  const query = search && parseSearch(search, state)
  const hash = h && stripPermalink(h) // remove possible permalink, eg #!userId=123
  
  if (query && hash) return { query, hash }
  if (query)         return { query }
  if (hash)          return { hash }
}                                                                                   // output: { query: { bar: 'baz' }, hash: 'bla' }   



export const queryHashToSearchHash = ({ query, hash: h } = {}, state = {}) => {     // input: { query: { bar: 'baz' }, hash='bla' }
  const search = query ? stringifyQuery(query, state) : ''
  const hash = !h ? '' : stripPermalink(h)
  return { search, hash }
}                                                                                   // output: { search: 'bar=baz', hash: 'bla' }  




export const cleanSearchHash = ({ search: s, hash: h }) => ({
  hash:   !h ? '' : stripPermalink(h),
  search: !s ? '' : s[0] === '?' ? s.substr(1) : s,
})






export const createRelativeUrl = (pathname, search, hash) =>
  `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`



// helper to conform to our location requirements of { url, pathname, search, hash } on all platforms

export const urlToLocation = urlOrLoc => {
  if (typeof urlOrLoc === 'object') return browserLocationToRespondLocation(urlOrLoc)

  let pathname = urlOrLoc.replace(/^.*\/\/[^/?#]+/, '') // remove possible domain
  let search = ''
  let hash = ''

  const hashIndex = pathname.indexOf('#')

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

  const url = `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`

  return { url, pathname, search, hash }
}



const browserLocationToRespondLocation = loc => {
  let { pathname, search, hash } = loc
  const url = pathname + search + hash  // relative

  search = search.replace(/^\?/, '')    // no leading ?
  hash = hash.replace(/^#/, '')         // no leading #
  
  return { url, pathname, search, hash }
}
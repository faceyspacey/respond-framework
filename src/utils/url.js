import { parseSearch, stringifyQuery } from './searchQuery.js'


export const searchHashToQueryHash = ({ search, hash: h } = {}, state = {}) => {     // input: { search: '?bar=baz', hash='#bla' }
  const query = search ? parseSearch(search, state) : {}
  const hash = !h ? '' : h[0] === '#' ? h.substr(1) : h
  return { query, hash }                                                            // output: { query: { bar: 'baz' }, hash: 'bla' }   
}


export const queryHashToSearchHash = ({ query, hash: h } = {}, state = {}) => {     // input: { query: { bar: 'baz' }, hash='bla' }
  const search = query ? stringifyQuery(query, state) : ''
  const hash = !h ? '' : h[0] === '#' ? h.substr(1) : h
  return { search, hash }                                                           // output: { search: 'bar=baz', hash: 'bla' }  
}




export const cleanSearchHash = ({ search: s, hash: h }) => ({
  hash:   !h ? '' : h[0] === '#' ? h.substr(1) : h,
  search: !s ? '' : s[0] === '?' ? s.substr(1) : s,
})


export const createRelativeUrl = (pathname, search, hash) =>
  `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`



// helper to conform to our location requirements of { pathname, search, hash } on all platforms

export const urlToLocation = url => {
  if (typeof url === 'object') return url

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
import { parseSearch, stringifyQuery } from './searchQuery.js'


export const urlToLocation = (url, state) => {
  if (typeof url === 'object') {
    return cleanLocation(url, state)
  }

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

  const query = !search ? {} : parseSearch(search, state) 

  url = `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`

  return { url, pathname, search, hash, query }
}


export const cleanLocation = (loc = {}, state) => {
  const { pathname: p, search: s, hash: h, query: q } = loc
  
  const pathname = p?.charAt(0) === '/' ? p : p ? '/' + p : '/'
  let search = s?.charAt(0) === '?' ? s.substr(1) : s || ''
  const hash = h?.charAt(0) === '#' ? h.substr(1) : h || ''

  const url = `${pathname}${search ? '?' + search : ''}${hash ? '#' + hash : ''}`

  const query = q || (!search ? {} : parseSearch(search, state)) 

  if (!search && q) {
    search = stringifyQuery(q, state)
  }

  return { url, pathname, search, hash, query }
}
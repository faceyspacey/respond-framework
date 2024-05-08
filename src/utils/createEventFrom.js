import { pathToRegexp } from 'path-to-regexp'
import parseSearch from './parseSearch.js'



export default (getStore, eventsTree) => {
  const events = createEventsByPathSpec(eventsTree)

  return (pathOrLocation, additionalParams) => {
    const parts = locationToParts(pathOrLocation, getStore)
    const { basename = '' } = getStore().state

    if (basename) {
      parts.pathname = parts.pathname.substring(basename.length)
    }
  
    const patterns = Object.keys(events)

    try {
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i]
        const { match, keys } = matchPath(parts.pathname, pattern)
    
        if (match) {
          const [_path, ...values] = match
  
          const arg = keys.reduce((arg, key, index) => {
            arg[key.name] = values[index]
            return arg
          }, {})
  
          const event = events[pattern]
  
          const a = { ...additionalParams, ...arg }
          const aFormatted = event.fromUrl?.(getStore(), a, parts) || a
  
          return event(aFormatted)
        }
      }
    }
    catch (error) {}

    throw new Error (`respond: no event matched path "${parts.pathname}".`)
  }
}


const locationToParts = (loc, getStore) => {
  if (typeof loc === 'string') {
    loc = new URL(loc, 'http://site.com')
  }
  
  const parse = getStore().options.parseSearch || parseSearch

  const url = `${loc.pathname}${loc.search}${loc.hash}`

  return {
    url,
    pathname: loc.pathname,
    search: parse(loc.search),
    hash: loc.hash.substring(1),
  }
}


const matchPath = (pathname, pattern, options = {}) => {
  const { re, keys } = compilePath(pattern, options)
  const match = re.exec(pathname)

  if (!match || (options.exact && match[0] !== pathname)) return {}

  return { match, keys }
}


const compilePath = (pattern, { partial = false, strict = false }) => {
  const k = `${pattern}${partial ? 't' : 'f'}${strict ? 't' : 'f'}`
  if (cache[k]) return cache[k]

  const keys = []
  const re = pathToRegexp(pattern, keys, { end: !partial, strict })

  return cache[k] = { re, keys }
}


const cache = {}



const createEventsByPathSpec = events =>
  Object.keys(events).reduce((acc, _type) => {
    const event = events[_type]

    const isNamespace = !event.kind

    if (isNamespace) {
      const children = createEventsByPathSpec(event)
      return { ...acc, ...children }
    }

    const { path } = event

    if (path) acc[path] = event

    return acc
  }, {})


import { pathToRegexp } from 'path-to-regexp'
import { cleanSearchHash, searchHashToQueryHash, urlToLocation } from '../../utils/url.js'


export default function eventFrom(url, additionalArg, dontThrow = false) {
  const { eventsByPath } = this.respond

  const loc = urlToLocation(url)
  const { pathname } = loc

  const event = eventsByPath[pathname] // basic match, eg '/about', '/admin/users' etc
  if (event) return createEvent(event, loc, additionalArg)

  const paths = Object.keys(eventsByPath)

  try {
    const isMatch = createIsMatch(pathname)
    const { path, arg } = paths.find(isMatch) ?? {}
    if (path) return createEvent(eventsByPath[path], loc, additionalArg, arg)
  }
  catch {}

  if (dontThrow) return
  throw new Error (`respond: no event matched path "${pathname}".`)
}




const createEvent = (event, loc, additionalArg, arg) => {
  const state = event.module
  let argFromLoc

  if (event.fromLocation) {
    argFromLoc = event.fromLocation(state, { ...additionalArg, ...arg, ...loc, ...cleanSearchHash(loc) })
  }
  else if (loc.search || loc.hash) {
    argFromLoc = searchHashToQueryHash(loc, state)
  }
  
  return event({ ...additionalArg, ...arg, ...argFromLoc } )
}



const createIsMatch = pathname => path => {
  const found = matchPath(pathname, path)        // long ago early Respond iterations matched even based on query/search strings and the hash, but then it became clear that's a very uncommon need; so it was decided to stick to a simpler patch matching implementation here to serve as inspiration; so if you would like to dispatch different events, say, based on different query params, then just pass in your own createEventFrom option to createState, and you can match URLs to events any way you please
  if (!found.match) return

  const { match, keys } = found
  const [_path, ...values] = match

  const arg = keys.reduce((acc, key, index) => {
    acc[key.name] = values[index]
    return acc
  }, {})
  
  return { path, arg }
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
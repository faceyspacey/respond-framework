import { pathToRegexp } from 'path-to-regexp'
import { cleanSearchHash, searchHashToQueryHash, urlToLocation } from '../../utils/url.js'


export default function eventFrom(url, additionalArg) {
  const loc = urlToLocation(url)
  const { eventsByPattern } = this.respond

  const event = eventsByPattern[loc.pathname] // basic match, eg '/about', '/admin/users' etc
  if (event) return createEvent(event, loc, additionalArg)

  const cached = L1[loc.url]
  if (cached) return cached.event.create({ ...additionalArg, ...cached.arg, ...cached.argFromLoc })

  const patterns = Object.keys(eventsByPattern)

  const { pattern, arg } = find(patterns, loc.pathname) ?? {}
  return pattern && createEvent(eventsByPattern[pattern], loc, additionalArg, arg)
}




const createEvent = (event, loc, additionalArg, arg) => {
  const state = event.module
  let argFromLoc

  if (event.fromLocation) {
    argFromLoc = event.fromLocation.call(state, state, { ...additionalArg, ...arg, ...loc, ...cleanSearchHash(loc) })
  }
  else if (loc.search || loc.hash) {
    argFromLoc = searchHashToQueryHash(loc, state)
  }

  L1[loc.url] = { event, arg, argFromLoc }

  return event.create({ ...additionalArg, ...arg, ...argFromLoc })
}


const find = (patterns, pathname) => {
  for (const pattern of patterns) {
    const match = isMatch(pathname, pattern)
    if (match) return match
  }
}


const isMatch = (pathname, pattern) => {
  const { re, keys } = L2[pattern] ?? compilePath(pattern)
  const match = re.exec(pathname)

  if (!match) return

  const [_path, ...values] = match
  const arg = {}

  keys.forEach((key, i) => arg[key.name] = values[i])
  
  return { pattern, arg }
}



const compilePath = pattern => {
  const keys = []
  const re = pathToRegexp(pattern, keys)
  return L2[pattern] = { re, keys }
}


const L1 = {} // cache url
const L2 = {} // cache pattern for pathname
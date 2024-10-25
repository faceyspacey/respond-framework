import { pathToRegexp } from 'path-to-regexp'
import { cleanSearchHash, searchHashToQueryHash, urlToLocation } from '../../utils/url.js'


export default function eventFrom(url, additionalArg) {
  const loc = urlToLocation(url)
  const { eventsByPath } = this.respond

  const event = eventsByPath[loc.pathname] // basic match, eg '/about', '/admin/users' etc
  if (event) return createEvent(event, loc, additionalArg)

  const paths = Object.keys(eventsByPath)
  const isMatch = createIsMatch(loc.pathname)
  const { path, arg } = paths.find(isMatch) ?? {}
  
  return path && createEvent(eventsByPath[path], loc, additionalArg, arg)
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
  const { re, keys } = cache[path] ?? compilePath(path)
  const match = re.exec(pathname)

  if (!match) return

  const [_path, ...values] = match
  const arg = {}

  keys.forEach((key, i) => arg[key.name] = values[i])
  
  return { path, arg }
}



const compilePath = pattern => {
  const keys = []
  const re = pathToRegexp(pattern, keys)
  return cache[pattern] = { re, keys }
}


const cache = {}
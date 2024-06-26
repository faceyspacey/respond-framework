import { pathToRegexp } from 'path-to-regexp'
import { urlToLocation } from './url.js'
import { respondEventSymbol } from '../index.js'


export default (getStore, eventsTree) => {
  const events = createEventsByPathSpec(eventsTree)

  return function eventFrom(url, fallback, additionalArg, fallbackArg) {
    const loc = urlToLocation(url, getStore)                            // if url is already a location object, it will also be resolved
    const { basename = '' } = getStore().state

    if (basename) {
      loc.pathname = loc.pathname.substring(basename.length)            // strip basename, as event-to-url matching assumes it's not there
    }
  
    const patterns = Object.keys(events)

    try {
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i]
        const { match, keys } = matchPath(loc.pathname, pattern)        // long ago early Respond iterations matched even based on query/search strings and the hash, but then it became clear that's a very uncommon need; so it was decided to stick to a simpler patch matching implementation here to serve as inspiration; so if you would like to dispatch different events, say, based on different query params, then just pass in your own createEventFrom option to createStore, and you can match URLs to events any way you please
    
        if (match) {
          const [_path, ...values] = match
  
          const arg = keys.reduce((arg, key, index) => {
            arg[key.name] = values[index]
            return arg
          }, {})
  
          const event = events[pattern]

          const argFromLoc = event.fromLocation?.(getStore(), arg, loc) // pathname, search, hash, query are fully abstracted -- Respond doesn't know it's running in a browser -- so you convert, for example, the search string to a relevant pre-transformed payload on e.arg, which will then be passed to e.event.transform if available -- search strings will be pre-converted to a query object for you; and you can overwrite how that's performed via createStore({ options: { parseSearch } }) or customize conversion by ignore loc.query and performing your own on loc.search passed to e.event.fromLocation
          const argFinal = { ...additionalArg, ...arg, ...argFromLoc } 

          return event(argFinal)
        }
      }
    }
    catch (error) {}

    if (fallback) {
      const arg = { notFound: true, changePath: false, ...fallbackArg }
      
      if (fallback.event?.symbol === respondEventSymbol) {
        Object.assign(fallback, arg)
        Object.assign(fallback.arg, arg)
        return fallback // fallback could be passed as an actual event
      } 

      return eventFrom(fallback, undefined, arg)
    }

    throw new Error (`respond: no event matched path "${loc.pathname}".`)
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
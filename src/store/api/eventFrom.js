import { pathToRegexp } from 'path-to-regexp'
import { urlToLocation } from '../../utils/url.js'


export default function eventFrom(url, fallback, additionalArg, fallbackArg) {
  const loc = urlToLocation(url, this)                            // if url is already a location object, it will also be resolved
  const { basename = '' } = this

  if (basename) {
    loc.pathname = loc.pathname.substring(basename.length)            // strip basename, as event-to-url matching assumes it's not there
  }

  const { eventsByPath } = this
  const paths = Object.keys(eventsByPath)

  try {
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]
      const { match, keys } = matchPath(loc.pathname, path)        // long ago early Respond iterations matched even based on query/search strings and the hash, but then it became clear that's a very uncommon need; so it was decided to stick to a simpler patch matching implementation here to serve as inspiration; so if you would like to dispatch different events, say, based on different query params, then just pass in your own createEventFrom option to createStore, and you can match URLs to events any way you please
  
      if (match) {
        const [_path, ...values] = match

        const arg = keys.reduce((arg, key, index) => {
          arg[key.name] = values[index]
          return arg
        }, {})

        const event = eventsByPath[path]

        const argFromLoc = event.fromLocation?.(this, arg, loc) // pathname, search, hash, query are fully abstracted -- Respond doesn't know it's running in a browser -- so you convert, for example, the search string to a relevant pre-transformed payload on e.arg, which will then be passed to e.event.transform if available -- search strings will be pre-converted to a query object for you; and you can overwrite how that's performed via createStore({ options: { parseSearch } }) or customize conversion by ignore loc.query and performing your own on loc.search passed to e.event.fromLocation
        const argFinal = { ...additionalArg, ...arg, ...argFromLoc } 

        return event(argFinal)
      }
    }
  }
  catch (error) {}

  if (fallback) {
    const arg = { notFound: true, changePath: false, ...fallbackArg }
    
    if (fallback.event?.__event) {
      Object.assign(fallback, arg)
      Object.assign(fallback.arg, arg)
      return fallback // fallback could be passed as an actual event
    } 

    return eventFrom(fallback, undefined, arg)
  }

  throw new Error (`respond: no event matched path "${loc.pathname}".`)
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

import { pathToRegexp } from 'path-to-regexp'
import { cleanSearchHash, locationToRespondLocation, urlToLocation } from '../../utils/url.js'


export default function eventFrom(url, additionalArg, dontThrow = false) {
  const { state, eventsByPath } = this.respond
  const loc = urlToLocation(url)

  const { basename = '' } = state

  if (basename) {
    loc.pathname = loc.pathname.substring(basename.length)            // strip basename, as event-to-url matching assumes it's not there
  }

  const paths = Object.keys(eventsByPath)

  try {
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]
      const { match, keys } = matchPath(loc.pathname, path)        // long ago early Respond iterations matched even based on query/search strings and the hash, but then it became clear that's a very uncommon need; so it was decided to stick to a simpler patch matching implementation here to serve as inspiration; so if you would like to dispatch different events, say, based on different query params, then just pass in your own createEventFrom option to createState, and you can match URLs to events any way you please
      
      if (!match) continue

      const [_path, ...values] = match

      const arg = keys.reduce((arg, key, index) => {
        arg[key.name] = values[index]
        return arg
      }, {})

      const event = eventsByPath[path]
      let argFromLoc

      if (event.fromLocation) {
        const state = event.module
        const respondLoc = locationToRespondLocation(loc, state)
        argFromLoc = event.fromLocation(state, { ...additionalArg, ...arg, ...respondLoc }) // pathname, search, hash, query are fully abstracted -- Respond doesn't know it's running in a browser -- so you convert, for example, the search string to a relevant pre-transformed payload on e.arg, which will then be passed to e.event.transform if available -- search strings will be pre-converted to a query object for you; and you can overwrite how that's performed via createState({ options: { parseSearch } }) or customize conversion by ignore loc.query and performing your own on loc.search passed to e.event.fromLocation
      }
      else if (event.fromLocationCustom) {
        const state = event.module
        const respondLocSearchHashCleaned = cleanSearchHash(loc)
        argFromLoc = event.fromLocationCustom(state, { ...additionalArg, ...arg, ...respondLocSearchHashCleaned })
      }
      
      const argFinal = { ...additionalArg, ...arg, ...argFromLoc } 

      return event(argFinal)
    }
  }
  catch (error) {}

  if (dontThrow) return

  throw new Error (`respond: no event matched path "${pathname}".`)
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
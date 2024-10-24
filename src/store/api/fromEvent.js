import { compile } from 'path-to-regexp'
import { cleanSearchHash, createRelativeUrl, queryHashToSearchHash } from '../../utils/url.js'


const cache = {}

const opts = { encode: x => x } // just pathname by default, eg: '/foo'

const createPathname = (path, e) => {
  const argsToPathName = cache[path] ??= compile(path)
  return argsToPathName(e, opts)
}


export default function(e, basename) {
  const { path } = e.event ?? {}
  if (!path) return null

  const { event } = e
  const state = event.module

  basename ??= state.basename ?? ''

  try {
    if (event.locationFrom) {
      const loc = event.locationFrom(state, e) // user can customize search serialization
      const pathname = basename + loc.pathname // user also responsible for providing pathname, but not applying basename
      const { search, hash } = cleanSearchHash(loc)
      const url = createRelativeUrl(pathname, search, hash)
      return { url, pathname, search, hash }
    }
    else if (e.query || e.hash) {                   
      const pathname = basename + createPathname(path, e)  
      const { search, hash } = queryHashToSearchHash(e, state)
      const url = createRelativeUrl(pathname, search, hash)
      return { url, pathname, search, hash }
    }
    else {
      const pathname = basename + createPathname(path, e)
      return { url: pathname, pathname, search: '', hash: '' }
    }
  }
  catch (error) {
    console.error(error)
    throw new Error(`event.path "${path}" for event "${e.type}" received incompatible e.arg: ${e.arg ? JSON.stringify(e.arg) : 'undefined'}`)
  }
}
import { compile } from 'path-to-regexp'
import { cleanSearchHash, createRelativeUrl, queryHashToSearchHash } from '../../utils/url.js'


export default function(e) {
  const { event } = e
  const { path } = event

  if (!path) return null

  const state = event.module
  const bn = state.basenameFull

  if (event.locationFrom) {
    const loc = event.locationFrom.call(state, state, e)  // user can customize search serialization
    const pathname = bn + loc.pathname                    // developer also responsible for providing pathname, but not applying basename
    const { search, hash } = cleanSearchHash(loc)
    const url = createRelativeUrl(pathname, search, hash)
    return { url, pathname, search, hash }
  }
  else if (e.query || e.hash) {                   
    const pathname = bn + createPathname(path, e)  
    const { search, hash } = queryHashToSearchHash(e, state)
    const url = createRelativeUrl(pathname, search, hash)
    return { url, pathname, search, hash }
  }
  else {
    const pathname = bn + createPathname(path, e)
    return { url: pathname, pathname, search: '', hash: '' }
  }
}



const cache = {}

const opts = { encode: x => x } // just pathname by default, eg: '/foo'

const createPathname = (path, e) => {
  try {
    const argsToPathName = cache[path] ??= compile(path)
    return argsToPathName(e, opts)
  }
  catch (error) {
    throw new Error(`event.path "${path}" for event "${e.type}" received incompatible e.arg: ${e.arg ? JSON.stringify(e.arg) : 'undefined'}`)
  }
}
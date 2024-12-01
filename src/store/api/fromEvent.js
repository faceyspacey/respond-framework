import { compile } from 'path-to-regexp'
import { cleanSearchHash, createRelativeUrl, queryHashToSearchHash } from '../../utils/url.js'


export default function(e) {
  if (L1.has(e)) return L1.get(e)
    
  const { event } = e
  const { pattern } = event

  if (!pattern) return null

  const state = event.module
  const bn = state.basenameFull

  let res

  try {
    if (event.locationFrom) {
      const loc = event.locationFrom.call(state, state, e)  // user can customize search serialization
      const pathname = bn + loc.pathname                    // developer also responsible for providing pathname, but not applying basename
      const { search, hash } = cleanSearchHash(loc)
      const url = createRelativeUrl(pathname, search, hash)
      return res = { url, pathname, search, hash }
    }
    else if (e.query || e.hash) {                   
      const pathname = bn + createPathname(pattern, e)  
      const { search, hash } = queryHashToSearchHash(e, state)
      const url = createRelativeUrl(pathname, search, hash)
      return res = { url, pathname, search, hash }
    }
    else {
      const pathname = bn + createPathname(pattern, e)
      return res = { url: pathname, pathname, search: '', hash: '' }
    }
  }
  finally {
    L1.set(e, res)
  }
}



const L1 = new WeakMap  // cache e reference (useful for successive calls to isEqualNavigations used by built-in stack reducer in all modules)
const L2 = {}           // cache pattern for pathname

const opts = { encode: x => x } // just pathname by default, eg: '/foo'

const createPathname = (pattern, e) => {
  try {
    const argsToPathName = L2[pattern] ??= compile(pattern)
    return argsToPathName(e.arg, opts)
  }
  catch (error) {
    throw new Error(`event.pattern "${pattern}" for event "${e.type}" received incompatible e.arg: ${e.arg ? JSON.stringify(e.arg) : 'undefined'}`)
  }
}
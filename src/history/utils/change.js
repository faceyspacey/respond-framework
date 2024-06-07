import { getIndex } from './state.js'
import bs from '../browserState.js'
import * as bf from './backForward.js'


export default (url, forceReplace) => {
  const index = getIndex()

  if (index === undefined) replace(url, 0)    // first visit
  else if (!bs.hasTrap) replace(url, index)   // return visit in same session, not cached by browser (index will be defined, but trap not yet setup)
  else if (forceReplace) replace(url, index)  // subsequent redirects in single dispatch pipeline must be treated as a replace
  else push(url, index + 1)                   // new links (only one per user-triggered dispatch pipeline)
}

const push = (url, index = 1) => {
  bs.prevIndex = index
  bs.maxIndex = index
  bs.maxIndexRelative = index
  bs.maxUrl = url
  bs.linkedOut = false
  history.pushState({ index }, '', url)
}

const replace = async (url, index = 1) => {
  bs.prevIndex = index
  history.replaceState({ index }, '', url)
}
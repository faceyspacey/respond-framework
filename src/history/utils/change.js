import { getIndex } from './helpers.js'
import bs from '../browserState.js'


export default (url, redirect) => {
  const index = getIndex()

  if (index === undefined) replace(url, 0)    // first visit
  else if (!bs.hasTrap) replace(url, index)   // return visit in same session, not cached by browser (index will be defined, but trap not yet setup)
  else if (bs.pop) replace(url, index)        // url changes triggered by pop events must be treated as a replace
  else if (redirect) replace(url, index)      // subsequent redirects in single dispatch pipeline must both be treated as a replace
  else push(url, index + 1)                   // new links (only one per user-triggered dispatch pipeline)
}

const push = (url, index = 1) => {
  bs.prevIndex = index
  bs.maxIndex = index
  bs.linkedOut = false
  history.pushState({ index }, '', url)
}

const replace = async (url, index = 1) => {
  bs.prevIndex = index
  history.replaceState({ index }, '', url)
}
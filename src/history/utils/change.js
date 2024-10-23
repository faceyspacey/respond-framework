import bs from '../browserState.js'


export default (url, redirect) => {
  const i = history.state?.index

  if (i === undefined) replace(url, 0)    // first visit
  else if (!bs.hasTrap) replace(url, i)   // return visit in same session, not cached by browser (i will be defined, but trap not yet setup)
  else if (bs.pop) replace(url, i)        // url changes triggered by pop events must be treated as a replace (for duration of pop handler)
  else if (redirect) replace(url, i)      // subsequent redirects in single dispatch pipeline must both be treated as a replace
  else push(url, i + 1)                   // new links (only one per user-triggered dispatch pipeline)
}

const push = (url, i = 1) => {
  bs.prevIndex = i
  bs.maxIndex = i
  bs.linkedOut = false
  history.pushState({ index: i }, '', url)
}

const replace = async (url, i = 1) => {
  bs.prevIndex = i
  history.replaceState({ index: i }, '', url)
}
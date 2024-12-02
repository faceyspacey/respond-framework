import bs from './browserState.js'
import { createTrap } from './createTrap.js'


export default (e, redirect) => {
  if (e.changePath === false) return

  if (bs.pop) {
    bs.queuedNavigation = e
  }
  else if (window.state.replayTools?.playing) {
    debounce(() => changePath(e, true))
  }
  else changePath(e, redirect)
}


const changePath = (e, redirect) => {
  const { respond } = window.state
  const { ctx } = respond
  const { url } = respond.fromEvent(e)

  change(url, ctx.changedPath || redirect)
  ctx.changedPath = true

  createTrap()
}



const change = (url, redirect) => {
  const index = history.state?.index

  if (index === undefined) replace(url) // first visit
  else if (!bs.hasTrap) replace(url)    // return visit in same session when not cached by browser (index will be defined, but trap not yet setup)
  else if (redirect) replace(url)       // subsequent redirects in single dispatch pipeline must both be treated as a replace
  else push(url)                        // new links (only one per user-triggered dispatch pipeline)
}



export const replace = async url => {
  const index = history.state?.index ?? 0

  bs.prevIndex = index
  history.replaceState({ index }, '', url)
  window.state.prevUrl = url // saves in sessionState -- todo: move to a single object for such things
}

export const push = url => {
  const index = (history.state?.index ?? 0) + 1

  bs.prevIndex = index
  bs.maxIndex = index
  bs.linkedOut = false
  history.pushState({ index }, '', url)
  window.state.prevUrl = url // saves in sessionState -- todo: move to a single object for such things
}



let timer
const debounce = func => {
  clearTimeout(timer)
  timer = setTimeout(func, 50)
}
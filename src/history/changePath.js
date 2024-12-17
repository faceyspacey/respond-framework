
import bs from './browserState.js'
import { createTrap } from './createTrap.js'


export default e => {
  if (e.changePath === false) return

  if (bs.pop) {
    bs.queuedNavigation = e // trap will dequeue
  }
  else {
    const useReplace = e.event.respond.topState.replayTools?.playing
    const change = () => changePath(e, useReplace)
    debounce(change)
  }
}


const changePath = (e, useReplace) => {
  const { fromEvent, mem } = e.event.respond
  const { url } = fromEvent(e)

  change(url, useReplace || mem.changedPath)
  mem.changedPath = true

  createTrap()
}



const change = (url, useReplace) => {
  const index = history.state?.index

  if (index === undefined) replace(url) // first visit
  else if (useReplace)     replace(url) // subsequent redirects in single dispatch pipeline must both be treated as a replace
  else if (!bs.hasTrap)    replace(url) // return visit in same session when not cached by browser (index will be defined, but trap not yet setup)
  else                     push(url)    // new links (only one per user-triggered dispatch pipeline)
}



export const replace = async url => {
  const index = history.state?.index ?? 0

  bs.prevIndex = index
  history.replaceState({ index }, '', url)
  window.state.respond.prevUrl = url
}

export const push = url => {
  const index = (history.state?.index ?? 0) + 1

  bs.prevIndex = index
  bs.maxIndex = index
  bs.linkedOut = false
  history.pushState({ index }, '', url)
  window.state.respond.prevUrl = url
}



let timer
const debounce = func => {
  clearTimeout(timer)
  timer = setTimeout(func, 50)
}
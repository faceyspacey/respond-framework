import { push, replace, shouldChange, getIndex } from './utils/pushReplace.js'
import { pollCondition } from '../utils/timeout.js'
import { back, forward, isDrainsDisabled, hydrateFromSessionStorage, isPastHmrOnLoadPhase, removeTail } from './utils/backForward.js'
import bs from './browserState.js'
import createTrap from './createTrap.js'


export default store => {
  if (isDrainsDisabled(store)) {
    return e => shouldChange(e) && replace(store.fromEvent(e).url) // history does nothing in native / when drains disabled
  }

  if (window._changePath) return window._changePath // HMR

  hydrateFromSessionStorage()
  createTrap() // where the magic happens

  return window._changePath = changePath
}



const changePath = async (e, drain) => {
  const store = window.store

  await pollCondition(() => bs.ready, 9) // initial setup has very small of chance of not being ready by the time application code dispatches the first path

  bs.returnedFrontCached = false
  bs.returnedBackCached = false

  bs.workaroundTailUrl = null

  const { url } = store.fromEvent(e)

  const index = getIndex()

  if (bs.isFirstReplace) {  // browsers don't like more history changes on load, except replace
    // replace(url, index)     // index will have to remain the same, even if 0, and will be corrected on next call to changePath -- another option was to ignore the initial replace altogether (just assuming the initial URL was already correct), but that would prevent redirects on init
    bs.isFirstReplace = false
    return
  }

  if (index === 1) {
    replace(url) // the original default case, where we always replace on index 1
  }

  // WORKAROUNDS for browsers that cache the page and don't reload code when backing/forwarding to other sites (mainly Safari) -- so index will be 2 or 0
  else if (index === 2) {
    await back()
    replace(url)
  }
  else if (index === 0) {
    if (bs.returning) {
      await forward()
      replace(url)
    }
    else {
      push(url) // this is now the default case on most fresh opens of the app, centering on index 1; originally createTrap replaced and then pushed, but Safari did not like that
    }
  }

  // removeTail to mimic traditional/expected browser behavior (when possible)
  if (bs.hasTail && isPastHmrOnLoadPhase()) {
    const hasDrains = !!(store.events.drainBack || store.events.drainForward)
    const notDraining = hasDrains && !drain && !e.meta.from?.meta.drain
    const isPushState = notDraining
    
    if (isPushState) {
      removeTail(true) // only remove tail -- disabling the forward button -- when the traditional "pushState" method is called (ie not during draining)
    }
  }
}
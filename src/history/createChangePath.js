import { Linking } from 'react-native'
import { isDev, isNative, isTest } from '../utils/bools.js'

import { push, replace, shouldChange } from './utils/pushReplace.js'

import sessionStorage from '../utils/sessionStorage.js'
import { pollCondition } from '../utils/timeout.js'
import { cleanLocation } from '../utils/url.js'

let linkedForward
let returning
let hasTail
let returnedFrontCached = false
let returnedBackCached = false
let workaroundTailUrl = false
let isFirstReplace = true
let centered = true
let ready = false
let hmrLoadDone = !returning


export const setupHistory = store => {
  if (isDrainsDisabled(store)) {
    return e => shouldChange(e) && replace(store.fromEvent(e).url) // history does nothing in native / when drains disabled
  }

  if (window._changePath) { // HMR
    return window._changePath
  }

  hydrateFromSessionStorage()

  createTrap()
  return window._changePath = changePath
}





const createTrap = async () => {
  const index = getIndex()
  const url = getUrl()

  addPopListener(popListener)

  if (index === 0) {                  // returning from back
    await forward()
    replace(url)
  }
  else if (index === 1) {
                                      // refresh (all setup aready)
  }
  else if (index === 2) {             // returning from forward
    await back()
    replace(url)
  }
  else if (index === undefined) {    // new tab/window
    replace(url, 0)                  // note: push will be used by 2nd path, centering the trap then (browsers don't like too many browser changes at once)
  }

  ready = true
}



const popListener = async () => {
  if (!centered) return centered = true // key ingredient: allows for ignoring centering back/forward calls; the goal is for path replacement to have when centered on index 1
  store = window.store // ensures latest store during HMR (it's just easiest in terms of HMR, and makes sense since we're dealing with a global `history` anyway)

  const index = getIndex()

  const goingBack = index === 0
  const goingForward = index === 2

  const workaroundCaching = index === 1
  const workaroundDisableForward = goingForward && workaroundTailUrl

  if (goingBack) {
    await forward() // return to center

    const backEvent = store.events.drainBack?.(store)
    await backEvent?.dispatch(undefined, { trigger: true, drain: 'back' })

    if (!hasTail) {
      await addTail() // needs to trigger front arrow to display by pushing a tail, and then returning back to center
    }
  }
  else if (goingForward && !workaroundDisableForward) {
    await back()  // return to center

    const forwardEvent = store.events.drainForward?.(store)
    await forwardEvent?.dispatch(undefined, { trigger: true, drain: 'forward' })
  }


  // WORKAROUNDS for browsers that cache the page and don't reload code when backing/forwarding to other sites (mainly Safari)
  else if (workaroundCaching) {
    if (returnedFrontCached) {
      returnedFrontCached = false

      const backEvent = store.events.drainBack?.(store)
      await backEvent?.dispatch(undefined, { trigger: true, drain: 'back' })
    }
    else if (returnedBackCached) {
      returnedBackCached = false

      const forwardEvent = store.events.drainForward?.(store)
      await forwardEvent?.dispatch(undefined, { trigger: true, drain: 'forward' })
    }
  }


  // WORKAROUND for calling disableForwardButton in userland, after having backed/forwarded off the site, which causes removeTail to trigger a future press of the back button to prematurely take u off the site -- instead we just let u tap forward one more time to disable the button
  else if (workaroundDisableForward) {
    replace(workaroundTailUrl, 2)
    workaroundTailUrl = false
  }
}



const changePath = async (e, drain) => {
  const store = window.store

  await pollCondition(() => ready, 9) // initial setup has very small of chance of not being ready by the time application code dispatches the first path

  returnedFrontCached = false
  returnedBackCached = false

  workaroundTailUrl = false

  const { url } = store.fromEvent(e)

  const index = getIndex()

  if (isFirstReplace) { // browsers don't like more history changes on load, except replace
    replace(url, index) // index will have to remain the same, even if 0, and will be corrected on next call to changePath -- another option was to ignore the initial replace altogether (just assuming the initial URL was already correct), but that would prevent redirects on init
    isFirstReplace = false
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
    if (returning) {
      await forward()
      replace(url)
    }
    else {
      push(url) // this is now the default case on most fresh opens of the app, centering on index 1; originally createTrap replaced and then pushed, but Safari did not like that
    }
  }


  // removeTail to mimic traditional/expected browser behavior (when possible)
  if (hasTail && isPastHmrOnLoadPhase()) {
    const hasDrains = !!(store.events.drainBack || store.events.drainForward)
    const notDraining = hasDrains && !drain && !e.meta.from?.meta.drain
    const isPushState = notDraining
    
    if (isPushState) {
      removeTail(true) // only remove tail -- disabling the forward button -- when the traditional "pushState" method is called (ie not during draining)
    }
  }
}






// utils

const back = async () => {
  centered = false
  history.back()
  await pollCondition(() => centered = true, 9)
}

const forward = async () => {
  centered = false
  history.forward()
  await pollCondition(() => centered = true, 9)
}


const addTail = async () => {
  hasTail = true
  linkedForward = false

  sessionStorage.setItem('hasTail', true)
  sessionStorage.removeItem('linkedForward')

  push(getUrl(), 2)
  await back()
}

const removeTail = async force => {
  if (!hasTail) return
  if (linkedForward && !force) return // userland code should call disableForwardButton at the end of their history, without needing to know what happens outside of the app; if internally we determined the user had previously linked out, we'll ignore the request and continue to display the forward button
  
  // There's a heuristic in browsers where if you doo too many programmatic back/forwards/pushes, the browser won't respect them
  // and the result will eventually be that if you tap the back button, you're prematurely taken off the site.
  // So our solution for the disableForwardButton feature is to require u to tap it a second time to see the forward button disabled,
  // putting you on index 2, which the pop handler and changePath function can detect and re-align with existing code for handling caching browsers (plus an extra case in the pop handler)
  if (returning && !force) {
    workaroundTailUrl = getUrl()  // flag so when the forward button is tapped one more time, recentering doesn't occur and this URL is displayed
    returnedFrontCached = true    // necessary to realign to index 1 if you tap back from our index 2 disable forward (reuses is cached browser workaround handling)
    return 
  }

  const url = getUrl()
  await back()

  push(url)

  sessionStorage.removeItem('hasTail')
  sessionStorage.removeItem('linkedForward')

  hasTail = false
  linkedForward = false
}


const getUrl = () => cleanLocation(location).url

const getIndex = () => history.state?.index




const hydrateFromSessionStorage = () => {
  linkedForward = sessionStorage.getItem('linkedForward')
  returning = sessionStorage.getItem('returning')
  hasTail = sessionStorage.getItem('hasTail')
}


const isDrainsDisabled = store => {
  if (isTest) return true
  if (isNative) return true
  if (isDev && !store.options.enableDrainsInDevelopment) return true

  const { drainBack, drainForward } = store.events
  const hasDrains = drainBack || drainForward

  return !hasDrains
}


const isPastHmrOnLoadPhase = () => process.env.NODE_ENV !== 'development' || hmrLoadDone
typeof document !== 'undefined' && document.addEventListener?.('click', () => hmrLoadDone = true, { capture: true, once: true }) // minor fix: when backing off the site after an HMR, HMR is triggered immediately on load to prevent the browser from serving cached modules, causing changePath to be called a second time, resulting in removeTail being incorrectly called; so we just assume once the user clicks the browser, we're past that phase; ideally there would be a hook into the webpack HMR lifecycle on load


// userland api 

export const exitBack = async () => {
  sessionStorage.setItem('sessionState', window.store.stringifyState())
  sessionStorage.setItem('returning', true)

  returning = true // browser window can sometimes be cached, and uses existing variables
  returnedBackCached = true

  await back()
  history.back() // dont use await back() because centered will be set to false in caching browsers like Safari when you return via back/forward buttons

  return false
}


export const exitForward = async () => {
  if (!linkedForward) return false

  sessionStorage.setItem('sessionState', window.store.stringifyState())
  sessionStorage.setItem('returning', true)

  returning = true
  returnedFrontCached = true
  
  await forward()
  history.forward()

  return false
}


export const disableForwardButton = () => removeTail()



export const createLinkOut = getStore => async (url, e) => {
  e = typeof url === 'object' ? url : e
  url = typeof url === 'string' ? url : e?.target.href // convenience: <a href={url} onClick={store.linkOut}
  
  e?.preventDefault()

  if (process.env.NODE_ENV === 'test') {
    return url
  }

  if (!process.env.WEB) {
    Linking.openURL(url)
    return
  }

  if (location.host === new URL(url).host) {
    window.open(url, '_blank') // a host of problems will occur if you open your site twice in the same tab, as they'll share the same sessionStorage -- apps should be designed to not need reloads, which is especially easy to resolve given Respond keeps pretty much everything in state, including things such as basenames and cachedPaths; if you really need this -- which is a non-ideal workaround in today's reactive landscape -- feel free to work on this file and submit a PR; basically you will have to differentiate between the below sessionStorage items between multiple tabs somehow; the juice most likely isn't worth the squeeze
    return
  }

  if (isDrainsDisabled(getStore())) {
    window.location = url
    return
  }

  const json = getStore().stringifyState()

  sessionStorage.setItem('sessionState', json)

  sessionStorage.setItem('hasTail', true)
  sessionStorage.setItem('linkedForward', true)
  sessionStorage.setItem('returning', true)

  hasTail = true
  linkedForward = true
  returning = true

  returnedFrontCached = true

  if (getIndex() !== 2) { // it's possible that because of our tail disableForward tail workaround that we're already on index 2
    push(getUrl(), 2) // we want the tail to be index 2, so if you return, we still have our trap around index 1, while still allowing you to "exitForward" to the clicked out site if one is available
  }

  window.location = url
}







// standard utils

const weakMap = new WeakMap


const addPopListener = onPop => {
  const onPopState = e => !isExtraneousPopEvent(e) && onPop() // ignore extraneous popstate events in WebKit

  const useHash = !supportsPopStateOnHashChange()
  weakMap.set(onPop, onPopState)

  addEventListener(window, 'popstate', onPopState)
  if (useHash) addEventListener(window, 'hashchange', onPopState)
}



const removePopListener = onPop => {
  const onPopState = weakMap.get(onPop)
  const useHash = !supportsPopStateOnHashChange()

  removeEventListener(window, 'popstate', onPopState)
  if (useHash) removeEventListener(window, 'hashchange', onPopState)
}


const addEventListener = (node, event, listener) =>
  node.addEventListener
    ? node.addEventListener(event, listener, false)
    : node.attachEvent(`on${event}`, listener)


const removeEventListener = (node, event, listener) =>
  node.removeEventListener
    ? node.removeEventListener(event, listener, false)
    : node.detachEvent(`on${event}`, listener)


// Returns true if browser fires popstate on hash change. IE10 and IE11 do not.
const supportsPopStateOnHashChange = () =>
  window.navigator.userAgent.indexOf('Trident') === -1


/**
 * Returns true if a given popstate event is an extraneous WebKit event.
 * Accounts for the fact that Chrome on iOS fires real popstate events
 * containing undefined state when pressing the back button.
 */
export const isExtraneousPopEvent = event =>
  event.state === undefined && navigator.userAgent.indexOf('CriOS') === -1

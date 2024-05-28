import { Linking } from 'react-native'
import { isDrainsDisabled } from './utils/backForward.js'
import { getUrl, getIndex, push } from './utils/pushReplace.js'
import { back, forward, removeTail } from './utils/backForward.js'
import sessionStorage from '../utils/sessionStorage.js'
import bs from './browserState.js'
import { removePopListener } from './utils/popListener.js'
import { popListener } from './createTrap.js'



export const exitBack = async () => {
  sessionStorage.setItem('sessionState', window.store.stringifyState())
  sessionStorage.setItem('returning', true)

  bs.returning = true // browser window can sometimes be cached, and uses existing variables
  bs.returnedBackCached = true

  // removePopListener(popListener) // so caching browsers won't have pop listener on return, and will need to to add it again as part of the standard flow

  await back()
  history.back() // dont use await back() because centered will be set to false in caching browsers like Safari when you return via back/forward buttons

  return false
}


export const exitForward = async () => {
  if (!bs.linkedForward) return false

  sessionStorage.setItem('sessionState', window.store.stringifyState())
  sessionStorage.setItem('returning', true)

  bs.returning = true
  bs.returnedFrontCached = true
  
  await forward()
  history.forward() // exit

  return false
}


export const disableForwardButton = () => removeTail()


export const linkOut = async (url, e) => {
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

  if (isDrainsDisabled(window.store)) {
    window.location = url
    return
  }

  const json = window.store.stringifyState()

  sessionStorage.setItem('sessionState', json)

  sessionStorage.setItem('hasTail', true)
  sessionStorage.setItem('linkedForward', true)
  sessionStorage.setItem('returning', true)

  bs.hasTail = true
  bs.linkedForward = true
  bs.returning = true

  bs.returnedFrontCached = true

  if (getIndex() !== 2) { // it's possible that because of our tail disableForward tail workaround that we're already on index 2
    push(getUrl(), 2) // we want the tail to be index 2, so if you return, we still have our trap around index 1, while still allowing you to "exitForward" to the clicked out site if one is available
  }

  window.location = url
}
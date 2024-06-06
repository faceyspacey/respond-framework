import { Linking } from 'react-native'
import { isPopDisabled } from './utils/backForward.js'
import { getIndex } from './utils/state.js'
import sessionStorage from 'respond-framework/utils/sessionStorage.js'
import bs from './browserState.js'
import * as bf from './utils/backForward.js'

export { default as changePath } from './changePath.js'


export const backOut = async () => {
  sessionStorage.setItem('sessionState', window.store.stringifyState())

  bs.prevIndex = -1

  const { linkedOut, maxIndex } = bs
  sessionStorage.setItem('browserState', JSON.stringify({ linkedOut, maxIndex }))

  await bf.go(-getIndex())
  history.back()

  return false
}


export const forwardOut = async () => {
  if (!bs.linkedOut) return false // return false, so event can short-circuit

  sessionStorage.setItem('sessionState', window.store.stringifyState())
  
  bs.prevIndex = bs.maxIndex + 1
  bs.out = true

  const { linkedOut, maxIndex } = bs
  sessionStorage.setItem('browserState', JSON.stringify({ linkedOut, maxIndex }))

  await bf.go(bs.maxIndex - getIndex())
  history.forward()

  return false
}


export const linkOut = async (url, e) => {
  e = typeof url === 'object' ? url : e                       // convenience: <a href={url} onClick={store.history.linkOut}
  url = typeof url === 'string' ? url : e?.currentTarget.href
  
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

  if (isPopDisabled(window.store)) {
    window.location = url
    return
  }

  sessionStorage.setItem('sessionState', window.store.stringifyState())

  bs.prevIndex = bs.maxIndex + 1
  bs.linkedOut = true
  bs.out = true

  const { linkedOut, maxIndex } = bs
  sessionStorage.setItem('browserState', JSON.stringify({ linkedOut, maxIndex }))

  window.location = url
}
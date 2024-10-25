import { Linking } from 'react-native'
import sessionStorage from '../utils/sessionStorage.js'
import bs from './browserState.js'
import * as bf from './utils/backForward.js'
import { isNative, isTest } from '../utils/bools.js'


export default back => back ? backOut() : forwardOut()


const backOut = async () => {
  window.state.respond.saveSessionState()

  bs.prevIndex = -1

  const { linkedOut, maxIndex } = bs
  sessionStorage.setItem('browserState', JSON.stringify({ linkedOut, maxIndex }))

  await bf.go(-getIndex())
  history.back()
}


const forwardOut = async () => {
  if (!bs.linkedOut) {
    await bf.go(bs.maxIndex - getIndex())
    bs.prevIndex = bs.maxIndex
    history.replaceState(history.state, '', window.state.respond.ctx.prevUrl) // ensure the same/previous url appears on our placeholder tail entry
    return
  }

  window.state.respond.saveSessionState()
  
  bs.prevIndex = bs.maxIndex + 1
  bs.out = true

  const { linkedOut, maxIndex } = bs
  sessionStorage.setItem('browserState', JSON.stringify({ linkedOut, maxIndex }))

  await bf.go(bs.maxIndex - getIndex())
  history.forward()
}


export const linkOut = (url, e) => {
  e = typeof url === 'object' ? url : e                       // convenience: <a href={url} onClick={store.history.linkOut}
  url = typeof url === 'string' ? url : e?.currentTarget.href
  
  e?.preventDefault()

  if (isTest) return url

  if (isNative) {
    Linking.openURL(url)
    return
  }

  if (location.host === new URL(url).host) {
    window.open(url, '_blank') // a host of problems will occur if you open your site twice in the same tab, as they'll share the same sessionStorage -- apps should be designed to not need reloads, which is especially easy to resolve given Respond keeps pretty much everything in state, including things such as basenames and cachedPaths; if you really need this -- which is a non-ideal workaround in today's reactive landscape -- feel free to work on this file and submit a PR; basically you will have to differentiate between the below sessionStorage items between multiple tabs somehow; the juice most likely isn't worth the squeeze
    return
  }

  window.state.respond.saveSessionState()

  bs.prevIndex = bs.maxIndex + 1
  bs.linkedOut = true
  bs.out = true

  const { linkedOut, maxIndex } = bs
  sessionStorage.setItem('browserState', JSON.stringify({ linkedOut, maxIndex }))

  window.location = url
}


const getIndex = () => history.state?.index ?? 0 // should never be 0 if everything is working correctly
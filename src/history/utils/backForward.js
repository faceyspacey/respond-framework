import { isNative, isTest, isDev } from '../../utils/bools.js'
import { pollCondition } from '../../utils/timeout.js'
import { getUrl, push } from './pushReplace.js'
import bs from '../browserState.js'


export const back = async () => {
  bs.centered = false
  history.back()
  await pollCondition(() => bs.centered, 9)
}


export const forward = async () => {
  bs.centered = false
  history.forward()
  await pollCondition(() => bs.centered, 9)
}


export const addTail = async () => {
  bs.hasTail = true
  bs.linkedForward = false

  sessionStorage.setItem('hasTail', true)
  sessionStorage.removeItem('linkedForward')

  push(getUrl(), 2)
  await back()
}


export const removeTail = async force => {
  if (!bs.hasTail) return
  if (bs.linkedForward && !force) return // userland code should call disableForwardButton at the end of their history, without needing to know what happens outside of the app; if internally we determined the user had previously linked out, we'll ignore the request and continue to display the forward button
  
  // There's a heuristic in browsers where if you doo too many programmatic back/forwards/pushes, the browser won't respect them
  // and the result will eventually be that if you tap the back button, you're prematurely taken off the site.
  // So our solution for the disableForwardButton feature is to require u to tap it a second time to see the forward button disabled,
  // putting you on index 2, which the pop handler and changePath function can detect and re-align with existing code for handling caching browsers (plus an extra case in the pop handler)
  if (bs.returning && !force) {
    bs.workaroundTailUrl = getUrl()  // flag so when the forward button is tapped one more time, recentering doesn't occur and this URL is displayed
    bs.returnedFrontCached = true    // necessary to realign to index 1 if you tap back from our index 2 disable forward (reuses is cached browser workaround handling)
    return 
  }

  const url = getUrl()
  await back()

  push(url)

  sessionStorage.removeItem('hasTail')
  sessionStorage.removeItem('linkedForward')

  bs.hasTail = false
  bs.linkedForward = false
}


export const hydrateFromSessionStorage = () => {
  bs.linkedForward = sessionStorage.getItem('linkedForward')
  bs.hasTail = sessionStorage.getItem('hasTail')
  bs.returning = sessionStorage.getItem('returning')

  bs.hmrLoadDone = !bs.returning
}


export const isDrainsDisabled = store => {
  if (isTest) return true
  if (isNative) return true
  if (isDev && !store.options.enableDrainsInDevelopment) return true

  const { drainBack, drainForward } = store.events
  const hasDrains = drainBack || drainForward

  return !hasDrains
}


export const isPastHmrOnLoadPhase = () => !isDev || bs.hmrLoadDone


isDev && typeof document !== 'undefined' && document.addEventListener?.('click', () => bs.hmrLoadDone = true, { capture: true, once: true }) // minor fix: when backing off the site after an HMR, HMR is triggered immediately on return to prevent the browser from serving cached modules, causing changePath to be called a second time, resulting in removeTail being incorrectly called; so we just assume once the user clicks the browser, we're past that phase; ideally there would be a hook into the webpack HMR lifecycle on load
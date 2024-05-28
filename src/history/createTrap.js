import { replace, getUrl, getIndex } from './utils/pushReplace.js'
import { back, forward, addTail } from './utils/backForward.js'
import { addPopListener } from './utils/popListener.js'
import bs from './browserState.js'


export default async () => {
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

  bs.ready = true

  setTimeout(() => {
    bs.trulyReady = true
  }, 2500)
}



export const popListener = async () => {
  if (!bs.centered) return bs.centered = true // key ingredient: allows for ignoring centering back/forward calls; the goal is for path replacement to happen when centered on index 1
  const store = window.store // ensures latest store during HMR (it's just easiest in terms of HMR, and makes sense since we're dealing with a global `history` anyway)

  const index = getIndex()

  const goingBack = index === 0
  const goingForward = index === 2

  const workaroundCaching = index === 1
  const workaroundDisableForward = goingForward && bs.workaroundTailUrl

  if (goingBack) {
    await forward() // return to center

    if (!bs.ready || !bs.trulyReady) return

    const backEvent = store.events.drainBack?.()
    await backEvent?.dispatch(undefined, { trigger: true, drain: 'back' })

    // if (!bs.hasTail) {
    //   await addTail() // needs to trigger front arrow to display by pushing a tail, and then returning back to center
    // }
  }
  else if (goingForward && !workaroundDisableForward) {
    await back()  // return to center

    const forwardEvent = store.events.drainForward?.()
    await forwardEvent?.dispatch(undefined, { trigger: true, drain: 'forward' })
  }

  // WORKAROUNDS for browsers that cache the page and don't reload code when backing/forwarding to other sites (mainly Safari)
  else if (workaroundCaching) {
    if (bs.returnedFrontCached) {
      bs.returnedFrontCached = false

      const backEvent = store.events.drainBack?.()
      await backEvent?.dispatch(undefined, { trigger: true, drain: 'back' })
    }
    else if (bs.returnedBackCached) {
      bs.returnedBackCached = false

      const forwardEvent = store.events.drainForward?.()
      await forwardEvent?.dispatch(undefined, { trigger: true, drain: 'forward' })
    }
  }

  // WORKAROUND for calling disableForwardButton in userland, after having backed/forwarded off the site, which causes removeTail to trigger a future press of the back button to prematurely take u off the site -- instead we just let u tap forward one more time to disable the button
  else if (workaroundDisableForward) {
    replace(bs.workaroundTailUrl, 2)
    bs.workaroundTailUrl = null
  }
}
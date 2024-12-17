const weakMap = new WeakMap


export const addPopListener = onPop => {
  const onPopState = e => !isExtraneousPopEvent(e) && onPop() // ignore extraneous popstate events in WebKit

  const useHash = !supportsPopStateOnHashChange()
  weakMap.set(onPop, onPopState)

  addEventListener(window, 'popstate', onPopState)
  if (useHash) addEventListener(window, 'hashchange', onPopState)
}


export const removePopListener = onPop => {
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



// returns true if browser fires popstate on hash change. IE10 and IE11 do not.
const supportsPopStateOnHashChange = () =>
  window.navigator.userAgent.indexOf('Trident') === -1


// returns true if a given popstate event is an extraneous WebKit event.
// Accounts for the fact that Chrome on iOS fires real popstate events
// containing undefined state when pressing the back button.
const isExtraneousPopEvent = event =>
  event.state === undefined && navigator.userAgent.indexOf('CriOS') === -1

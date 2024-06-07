import { getIndex, getUrl } from './utils/state.js'
import { addPopListener, removePopListener } from './utils/popListener.js'
import bs from './browserState.js'
import * as bf from './utils/backForward.js'
import out from './out.js'
import change from './utils/change.js'
import { isDev } from '../utils.js'


export const createTrap = () => {
  if (bs.hasTrap) return
  addPopListener(popListener)
  bs.hasTrap = true
}

export const removeTrap = () => {
  if (!bs.hasTrap) return
  removePopListener(popListener)
  bs.hasTrap = false
}

export const popListener = async () => {
  const index = getIndex()

  if (bs.prevIndex === -1 && index === 0) {                               // browser cached on return from front
    bs.prevIndex = index
    return
  }
  else if (bs.prevIndex === bs.maxIndex + 1 && index === bs.maxIndex) {   // browser cached on return from tail
    bs.prevIndex = index
    return
  }
  else if (index === bs.prevIndex) {
    console.warn(`store.history: pop back/next cannot be determined as the current history index is equal to the previous one.${isDev ? ' This is likely a development/HMR-only problem' : ' Please test all browsers and submit a repro with a very precise set of instructions.'}`)
    return
  }

  const back = index < bs.prevIndex
  const forward = !back

  bs.changedUrl = null

  bs.pop = back ? 'back' : 'forward'                // ensure all dispatches in pop handler are considered pops
  await window.store.events.pop?.dispatch({ back, forward }, { trigger: true })
  bs.pop = false                                    // ...so changedUrl is queued, so we can go to tail if no change made, OR use replaceState as browsers don't honor history stack when more than one push is performed per user-triggered event

  // The Trap -- user must reach the 2nd index (from either end) to be trapped, i.e. delegate control to the events.pop handler.
  // This means everything behaves as you would expect on index 0 and 2nd index onward, but on the 1st index, if you tap back 2x, the trap won't prevent the user from leaving.
  // Not trapping the user until the 2nd index is necessary so a pop in the opposite direction doesn't reverse you off the site prematurely.

  if (back) {
    if (bs.maxIndex - index > 1) await bf.forward() // trap user by reversing
  }
  else {
    if (index > 1) await bf.back()                  // trap user by reversing
  }

  // Replace + Out Handling

  if (!bs.changedUrl) await out(back)               // missing pop handler or nothing left for pop handler to do -- fallback to default behavior of leaving site
  else {
    const tail = forward && !bs.linkedOut &&
      bs.maxIndex === index &&
      bs.maxUrl === bs.changedUrl &&                  
      !window.store.options.disableTail             // heuristics to determine tail, but not if user linked out

    if (tail) await out()                           // display forward button as not pressable
    
    change(bs.changedUrl, true)                     // replaceState (can't push in response to a pop)
  }
}


// ADDITIONAL NOTES:
// Ideally, the trap would kick on index 1. On index 0, there's no need, as there's no question of where to take the user except to the previous site. The same
// applies to both the front and tail of the history stack, eg take the user forward to the site he previously linked out to.

// Keep in mind the core reason all this is required is because only a single call to history.pushState is
// allowed per user-triggered event. The whole of the history module is geared towards supporting this browser requirement. If the rule is broken, browsers
// stop honoring the indexes of our "virtual" entries.

// It would be nice to fix the "hole" on index 1, if anyone can find another way. Many MANY ways have been tried to arrive at this solution.
// Our overall take is that on index 1, not being able to trap the user isn't a big deal, as he's still very close to where he came from and hasn't performed
// enough events that might make it logical to do anything other than let the user leave the site in 2 taps. In most cases, exactly what the user expects
// is what happens. Trapping only becomes more important once the user has drilled thru multiple separate navigators (eg. from a Bottom Tab Bar),
// where custom app-defined draining can lead to a better experience. However if only 2 events have been performed after the user has entered the
// site/app, there's very little decisions to make, and the user really shouldn't even be trapped. The back/forward buttons will still trigger your pop
// handler, with the only difference being that you can't block leaving the app in order to drain/undrain something unexpected.

// For example, say you have a BottomTabBar, and after the user opens the app, he taps the 2nd tab and then the 3rd. The only logical decision is
// to back to tab 2, and then tab 1 and then off the site when he pops backs. Or if he drills to the 3rd screen (2nd index) of a single navigator,
// the only logical flow is he backs out via 3 taps to the previous site.

// Another example: say you have a BottomTabBar and a drawer. The user taps tab 2, then opens the drawer. You now have 2 logical options: close
// the drawer first and then go to tab 1, or go to tab 1 and then close the drawer. Both of which can be handled before the user backs off the
// site without having to trap him.

// Now imagine: the user drilled to entry 4 on a Navigator attached to tab 1 and then tapped tab 2 and also drilled deeply into its Navigator.
// Perhaps the user switched back and forth between the 2 tabs/navigators multiple times. Here's now the problem Respond solves: the user
// has accumulated more traditional history entries than navigator entries he visited. If each Navigator has a max depth of 4 entries, the
// max amount of screens you want to go back through is 8. However, he could have done it through many more than 8 taps if he went back
// and forth between the tabs/navigators. Here's where your events.pop handler shines -- you can logically drain each navigator (one at a time)
// and allow him to exit the site afte 8 taps, rather than, say, 16. Then when he forwards back through the site, you can choose to perhaps
// only "undrain" a single navigator. The choice is yours, and serious apps have many navigators or "navigator equivalents" in parallel. That's
// the problem respond's history abstraction solves -- it solves for the reality that "apps" have multiple navigator equivalents in parallel which need
// to be reconciled with a linear history stack; and there's no "one size, fits all" solution, as every app has different needs and contexts.
// Customization of draining / undraining via the pop event gives you a path forward to approximate optimal user expectations for back/forward
// buttons in an advanced app environment. This is as opposed to being forced to drop secondary contexts/navigators that the user might want to return to.
// Or where going back and forth between far flung locations make for a jarring experience. Or most common: apps that don't support backing/forwarding
// because the app was designed as a route level reduction, which has become the case with basically every app that doesn't use Respond or redux-first-router.
// The reason most apps don't support backing/forwarding beyond standard web "page" sites is because as you revisit URLs, that URL doesn't encode the state
// (eg open/close state, eg navigator index) of parallel navigator equivalents, which may include, eg, a modal with multiple tabs, and many other possibilities.
// So as you go back to previous URLs, these navigator equivalents won't know what to do, and usually don't display. Conversely, in a Respond-reduced app,
// these navigator equivalents can *listen* (through reducers) to events which are primarily targeted at another navigator equivalent. So as you pop back and
// forth you can trigger a new primary navigator equivalent to correctly display, while secondarily, eg, closing a drawer, hiding a modal, resetting a history
// stack etc. The problem of *parallel* experiences / navigator equivalents is what Respond's reduction focus solves, making parallel experiences *sticky*
// while users change their focus elswhere, thereby not losing previous context. The pop handler allows you to play conductor and orchestrate focus logically
// while keeping the original logical stickiness of parallel experiences that made sense as the user performed them. Essentially, as the user pops back or forward,
// you want to *replay* the most logical reverse flow, given the custom characteristics of your app. And no linear history stack can properly interpret that
// for you without knowing your app. In sum, the trap discards the linear history stack in favor of a simple signal of back/forward, which you cross-reference
// with the current state of your app to determine the logical optimal experience.
import { addPopListener, removePopListener } from './helpers/popListener.js'
import bs from './browserState.js'
import * as buttons from './helpers/buttons.js'
import * as out from './helpers/out.js'
import { isDev } from '../utils.js'
import { replace } from './changePath.js'
import handleHashChange from './helpers/handleHashChange.js'


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
  const i = history.state?.index

  const back = i < bs.prevIndex
  const forward = !back

  const { events, respond } = window.state


  // 1) ENSURE GOING BACK OR FORWARD

  if (i === undefined) {
    return await handleHashChange(respond) // reloading current first page, because eg simply the hash was changed -- this probably covers other caching related extraneous browser pops
  }
  else if (bs.prevIndex === -1 && i === 0) {                          // browser cached on return from front
    bs.prevIndex = i
    return
  }
  else if (bs.prevIndex === bs.maxIndex + 1 && i === bs.maxIndex) {   // browser cached on return from tail
    bs.prevIndex = i
    return
  }
  else if (i === bs.prevIndex) {
    console.warn(`respond.history: pop back/next cannot be determined as the current history index is equal to the previous one.${isDev ? ' This is likely a development/HMR-only problem' : ' Please test all browsers and submit a repro with a very precise set of instructions.'}`)
    return
  }


  // 2) DRAIN DESIRED EVENT

  let tail = false

  if (events.pop) {
    const handler = back ? events.pop.back : events.pop.forward
    const e = await handler?.call(state, state)
  
    if (e) {
      bs.pop = back ? 'back' : 'forward'                  // trigger changePath to queue any dispatched URLs (only taking the last one) for replacement *after* reversing below
      await state.respond.trigger(e, { pop: bs.pop })
      delete bs.pop

      if (forward) {
        const eFromPotentialSubsequentForward = await events.pop.forward.call(state, state, { attempt: true }) // call forward handler again after state has changed to see if there's yet another entry to forward to -- if there isn't the pop won't be reversed/backed, thereby properly displaying the forwrad button in its disabled state
        tail = !eFromPotentialSubsequentForward
      }
    }
  }
  else if (isDev) {
    alert('Add a `pop` event to your top module to enable browser history back/forward.\n\nSee RespondFramework.com/docs/history for usage.')
  }


  // 3) The Trap
  
  // The goal is for your app to make the decision to exit or trigger another event via the `pop.back` or `pop.forward` handlers.
  // To accomodate that, the pop direction will be REVERSED if not exiting.

  // In a properly functioning (and well-behaving app!), the user will never feel "trapped".
  
  // In a simple websites, page-to-page transitions will perfectly match the URLs visited.
  // In complex apps, you have the opportunity to drain and undrain navigators + navigator-equivalents, resulting in the smoothest possible experiences.

  // CAVEAT: a total of 3 indexes are required to "trap" the user.

  // This is due to distinct behavior at each end of the stack:

  // 1) TAIL PROBLEM & SOLUTION (PERFECT):     Imagine you push an entry, and then tap back, and are immediately reversed: the forward button will incorrectly show as disabled. But in this case, we're in the clear, as we don't need to "trap" the user in order to let the `pop.back` handler decide what to do next. So the solution is simply not to trap/reverse when one index from the tail.
  // 2) HEAD PROBLEM & SOLUTION (EXCELLENT):   Imagine you push 2 entries, then tap back 2x, leaving the site; then you tap forward once: if we immediately reversed, you'd be back on index 0; if you then tap back, you'd be exited out the front/head, when you really should be now be back on index 0. Like #1, this can be solved by only trapping one index away from the head, but the caveat -- unlike #1 -- is there's no expected disabled forward button state to take its place, which means ideally we would be trapping (i.e. preventing the user from leaving), but instead we simply don't, which is fine, given that's what most users expected at this early juncture. FINAL NOTE: Open Source Contributor, beware, this can't be further improved without sacrificing the disabled forward button; think about it logically -- if u only have 2 entries, and u go back from 1 to 0, then we could solve the head problem by reversing/forwarding you, thereby providing the pre-requisites for head trapping; HOWEVER, this would come at the expense of the forward button properly displaying in its disabled state. In summary, you need at minimum 3 entries for full trapping. It only makes sense -- as you must sandwhich-in the middle entry somehow. The small price is essentially preventing overzealous (or ill-intentioned) developers from trying to trap the user immediately. Essentially, we don't allow you to trap a user who's shown little intent, which is what browser committees would want anyway. In summary, instant trapping was sacrificed in favor of optimal disabled states for the forward button. 

  // This means everything behaves as you would expect on index 0 and 2+, but on the index 1, if you tap back 2x, the trap won't prevent the user from leaving.
  // Tapping back 1x triggers the `pop.back` handler as you would expect. However, tapping it again will exit the app without giving you a chance to intercept it.

  // This typically matches user expectation early on, as they aren't expecting to see anything else, as they might had they drilled into multiple navigators or navigator-equivalents where custom "draining" can make for a better user experience.
  // However to optimize UX and since browsers track if pushes come from user events, triggerPlugin pushes the first 2 non navigations using the same URL.
  // That means in many cases, the trap will in fact be in effect when backing out from what would have been index 0. If you coded your `pop.back` handler correctly, chances are you will be exiting the user anyway.

  // Lastly, this scenario also occurs if you tap a link, return to the site, and then forward out. The logic below is the same for both sides.
  // But again, we really don't need to be trapping at this stage.
  
  // The main takeaway for users/developers is not to expect your pop handlers to fire when the user expects to exit the site :)

  // back
  if (back) {
    const distanceFromTail = bs.maxIndex - i
    if (distanceFromTail >= 2) await buttons.forward() // trap user by reversing
  }

  // forward
  else if (!tail) { // user not at developer-defined tail
    const distanceFromHead = i
    if (distanceFromHead >= 2) await buttons.back()    // trap user by reversing
  }
  else if (i === bs.maxIndex) {
    // default (no reversal necessary): actual history matches developer-defined tail
  }
  else if (i < bs.maxIndex) { // actual history needs to be moved forward (due to backing off the site and returning, resulting in being trapped in an earlier index)
    const delta = bs.maxIndex - i
    bs.prevIndex = bs.maxIndex
    await buttons.go(delta)
  }
  

  // 4) REPLACE URL -- note: draining + replacing are broken up into 2 separate steps so `replace` can happen on the index resolved by the the trap in step 3

  if (bs.queuedNavigation) {
    replace(respond.fromEvent(bs.queuedNavigation).url)
    delete bs.queuedNavigation
  }
  else {
    back ? await out.back() : await out.forward()  // missing pop handler or nothing left for pop handler to do -- fallback to default behavior of leaving site
  }
}



// ADDITIONAL NOTES:

// The core reason all this is required is because ONLY A SINGLE CALL TO history.pushState IS ALLOWED PER USER-TRIGGERED EVENT.

// The whole of the history module is geared towards supporting this browser requirement. If the rule is broken, browsers
// stop honoring the indexes of our "virtual" entries, which leads to unexpected behavior, namely treating your app as a single history stack entry,
// and exiting early without giving your `pop` handlers a chance to intercept -- even when the user is deep in your history stack.

// The moral of the story is: disrespect browser rules, and expect to get disprespected back. Your app will become a single entry.

// Our overall take is that on index 1, not being able to trap the user isn't a big deal, as he's still very close to where he came from and hasn't performed
// enough events that might make it logical to do anything other than let the user leave the site in 2 taps. In most cases, exactly what the user expects
// is what happens. Trapping only becomes more important once the user has drilled thru multiple separate navigators (eg. from a Bottom Tab Bar),
// where custom app-defined draining can lead to a better experience. However if only 2 events have been performed after the user has entered the
// site/app, there's very little decisions to make, and the user really shouldn't even be trapped. The back/forward buttons will still trigger your pop
// handler going from index 1 to index 0, but going from index 0 back, by definition, exits the user.

// For example, say you have a BottomTabBar, and after the user opens the app, he taps the 2nd tab and then the 3rd. The only logical decision is
// to go back to tab 2, and then tab 1 and then off the site when he pops backs. Or if he drills to the 3rd screen (2nd index) of a single navigator,
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
// only "undrain" a single navigator. The choice is yours, and serious apps have many navigators or "navigator equivalents" in parallel. 

// That's the problem respond's history abstraction solves -- it solves for the reality that "apps" have multiple navigator equivalents in parallel which need
// to be reconciled with a linear history stack; and there's no "one size, fits all" solution, as every app has different needs and contexts.

// Customization of draining / undraining via the pop event gives you a path forward to approximate optimal user expectations for back/forward
// buttons in an advanced application. This is as opposed to being forced to drop secondary contexts/navigators that the user might want to return to.
// Or where going back and forth between far flung locations make for a jarring experience. Or most common: apps that don't support backing/forwarding
// because the app was designed as a route level reduction, which has become the case with basically every app that doesn't use Respond or redux-first-router.

// The reason most apps don't support backing/forwarding beyond standard web "page" sites is because as you revisit URLs, that URL doesn't encode the state
// (eg open/close state, eg navigator index) of parallel navigator equivalents, which may include, eg, a modal with multiple tabs, and many other possibilities.

// So as you go back to previous URLs, these navigator equivalents won't know what to do, and usually don't display. 

// Conversely, in a Respond-reduced app, these navigator equivalents can *listen* (through reducers) to events which are primarily targeted at another navigator equivalent.
// So as you pop back and forth you can trigger a new primary navigator equivalent to correctly display, while secondarily, eg, closing a drawer, hiding a modal, resetting a history
// stack etc. The problem of *parallel* experiences / navigator equivalents is what Respond's reduction focus solves, making parallel experiences *sticky*
// while users change their focus elswhere, thereby not losing previous context. The pop handler allows you to play conductor and orchestrate focus logically
// while keeping the original logical stickiness of parallel experiences that made sense as the user performed them.

// Essentially as the user pops back or forward, you want to *replay* the most logical reverse flow, given the custom characteristics of your app.
// And no linear history stack can properly interpret that for you without knowing your app. In sum, the trap discards the linear history stack
// in favor of a simple signal of back/forward, which you cross-reference with the current state of your app to determine the logical optimal experience.

// Lastly keep in mind, a simple "modal" without any even tabs/pages of its own is a "navigator equivalent." Most apps don't even give modals there own URLs,
// which is subpar because often times that's the only place a piece of info is displayed, and it would be nice to email a link (or send a push notification)
// to this modal already opened. Similarly, on web you may wanna drain it without draining its containing navigator at the same time. And truly advanced apps
// have many small "modal equivalents" that all deserve to be drained like full-fledged navigators. Now any little bit of UI can be drained like entire screens.
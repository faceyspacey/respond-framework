import { kinds } from '../createEvents.js'


export default (curr, e, { events }) => {
  if (!curr && e.event === events.init) return e
  return e.kind === kinds.navigation ? e : curr
}



// example usages:


// simple Page-switching component

// const Page = (props, state) => {
//   switch(state.curr.event) {
//     case state.events.foo:
//       return <Foo />

//     case state.events.bar:
//       return <Bar />
//   }
// }


// tag events with .firstNavigation (note: place before reduce plugin)

// const firstNavigationPlugin = (store, e) => {
//   if (e.kind !== kinds.navigation) return
//   if (store.curr?.event !== store.events.init) return
//   e.meta.firstNavigation = true
// }
import { navigation } from '../kinds.js'


export default function (curr, e) {
  if (!curr && e.event === this.events.init) return e
  return e.kind === navigation ? e : curr
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

// const firstNavigationPlugin = (state, e) => {
//   if (e.kind !== kinds.navigation) return
//   if (state.curr?.event !== state.events.init) return
//   e.meta.firstNavigation = true
// }
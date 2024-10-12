import { useContext, memo, forwardRef, useEffect } from 'react'
import sliceByModulePath from '../utils/sliceByModulePath.js'
import useSnapshot from '../proxy/useSnapshot.js'
import RespondContext from './context.js'


export default (id = createUniqueModuleId()) => {
  const useStore = () => {
    const storeTop = useContext(RespondContext)
    const modulePath = storeTop.modulePathsById[id]
    return storeTop.modulePaths[modulePath]
  }


  const useRespond = sync => {
    const storeTop = useContext(RespondContext)
    const modulePath = storeTop.modulePathsById[id]

    const snap = useSnapshot(storeTop, sync)

    const store = storeTop.modulePaths[modulePath]
    const state = sliceByModulePath(snap, modulePath) // selector props require slicing storeTop.state to crawl to top of state tree

    return { events: state.events, state, store }
  }


  const respond = (Component, name = Component.name, sync) => {
    const { length } = Component

    if (length <= 1) return Component
    
    if (length === 5) {
      const { [name]: ComponentWithName } = {
        [name]: forwardRef(function(props, ref) {
          const { events, state, store } = useRespond(sync)
          return Component(props, events, state, store, ref)
        })
      }
  
      return ComponentWithName
    }

    const { [name]: ComponentWithName } = {
      [name]: function(props) {
        const { events, state, store } = useRespond(sync, length === 2)
        return Component(props, events, state, store)
      }
    }

    return ComponentWithName
  }


  const useStoreSubscribe = (listener, deps) => {
    const store = useStore()
  
    useEffect(() => {
      listener(store)
      return store.subscribe(listener)
    }, [store, ...deps])
  }


  return {
    id,
    useStore,
    useRespond,
    useStoreSubscribe,
    respond: (...args) => memo(respond(...args)),
  }
}


let idCounter = 0

function createUniqueModuleId() {
  return (idCounter++).toString()
}





// const ModuleId = createContext()
// ModuleId.displayName = 'ModuleId'


// const useModuleId = () => useContext(ModuleId)



// fully dynamic RespondWidget:

// export const createUseRespondWithDynamicWidgets = (id = createUniqueModuleId()) => {
//   const useRespond = sync => {
//     const store = useContext(RespondContext)

//     const { selectors, modulePathsById, modulePaths } = store
//     const modulePath = modulePathsById[useModuleId() || id] // useModuleId()
  
//     const events = sliceByModulePath(store.events, modulePath)

//     const snap = useSnapshot(store.state, { sync, selectors, modulePaths })
//     const state = sliceByModulePath(snap, modulePath)

//     return { events, state, store }
//   }

//   return { 
//     id,
//     useRespond,
//     respond,
//   }
// }

// const createWidget = (Widget, mod) => {
//   return function Component(props) {
//     const store = useContext(RespondContext)
//     const id = useMemo(() => createUniqueModuleId(Widget.displayName), [])

//     useEffect(() => {
//       store.addModule(id, mod)
//       return () => store.removeModule(id, mod)
//     }, [store, id])

//     return (
//       <ModuleId.Provider value={id}>
//         <Widget {...props} />
//       </ModuleId.Provider>
//     )
//   }
// }

// // usage: 

// export const { id, respond } = createUseRespondWithDynamicWidgets() // same as regular createUseRespond function, but with useModuleId to get id from context

// export const MyWidget = createWidget(respond((props, events, state) => state.foo), {
//   // id, // parentId optional (otherwise, it will just appear in the top level state namespace)
//   events,
//   reducers,
//   etc
// })




// export const createUseRespondWidgetPartiallyDynamic = () => {
//   const createWidget = Widget => {
//     Widget = respond(Widget)
//     const id = createUniqueModuleId()
//     return { id, Component }

//     function Component(props) {
//       return (
//         <ModuleId.Provider value={id}>
//           <Widget {...props} />
//         </ModuleId.Provider>
//       )
//     }
//   }

//   const useRespond = sync => {
//     const store = useContext(RespondContext)
//     const id = useModuleId()

//     const { selectors, modulePathsById, modulePaths } = store
//     const modulePath = modulePathsById[id]
  
//     const events = sliceByModulePath(store.events, modulePath)

//     const snap = useSnapshot(store.state, { sync, selectors, modulePaths })
//     const state = sliceByModulePath(snap, modulePath)

//     return { events, state, store }
//   }

//   return {
//     createWidget,
//     useRespond,
//     respond,
//   }
// }


// // usage: 

// // const { createWidget, respond } = createUseRespondWidgetPartiallyDynamic()

// // const Child = respond((props, events, state) => null)

// // const MyComponent = (props, events, state) =>
// //   <View>
// //     <Text>{state.foo}</Text>
// //     <Child />
// //   </View>

// // export const { id, Component } = createWidget(MyComponent)
// // export const { id: id2, Component: Component2 } = createWidget(MyComponent)


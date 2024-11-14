import { useContext, memo, forwardRef, useEffect } from 'react'
import sliceByModulePath from '../utils/sliceByModulePath.js'
import useSnapshot from '../proxy/useSnapshot.js'
import RespondContext from './context.js'


export default (id = createUniqueModuleId()) => {
  const useStore = () => {
    const top = useContext(RespondContext)
    const branch = top.modulePathsById[id]
    return top.modulePaths[branch]
  }


  const useRespond = sync => {
    const top = useContext(RespondContext)
    const branch = top.modulePathsById[id]

    const snap = useSnapshot(top, sync)
    const state = sliceByModulePath(snap, branch) // selector props require slicing top.state to crawl to top of state tree

    const store = top.modulePaths[branch]

    return { state, events: state.events, store }
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
    const state = useStore()
  
    useEffect(() => {
      listener(state)
      return state.respond.subscribe(listener)
    }, [state, ...deps])
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
import { useContext, memo, forwardRef, useEffect } from 'react'
import sliceBranch from '../utils/sliceBranch.js'
import useSnapshot from '../proxy/useSnapshot.js'
import RespondContext from './context.js'


export default (id = createUniqueModuleId()) => {
  const useStore = () => {
    const top = useContext(RespondContext)
    const branch = top.respond.branchLocatorsById[id]
    return top.respond.branches[branch]
  }


  const useRespond = () => {
    const top = useContext(RespondContext)
    const branch = top.respond.branchLocatorsById[id]

    const snap = useSnapshot(top)
    return sliceBranch(snap, branch) // selector props require slicing top.state to crawl to top of state tree
  }


  const respond = (Component, name = Component.name) => {
    const { length } = Component

    if (length <= 1) return Component
    
    if (length === 3) {
      const { [name]: ComponentWithName } = {
        [name]: forwardRef(function(props, ref) {
          return Component(props, useRespond(), ref)
        })
      }
  
      return ComponentWithName
    }

    const { [name]: ComponentWithName } = {
      [name]: function(props) {
        return Component(props, useRespond())
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
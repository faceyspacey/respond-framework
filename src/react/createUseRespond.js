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
    const isolated = top.respond.isolatedBranches[branch]

    return isolated
      ? useSnapshot(sliceBranch(top, branch)) // optimization: reactive crawl from top on state changes is not necessary in useSnapshot, so we can pre-slice
      : sliceBranch(useSnapshot(top), branch) // props depend on parent state, accessed via this[_parentSymbol] in generated selectors
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


  const useSubscribe = (subscriber, deps, triggerOnly) => {
    const state = useStore()
  
    useEffect(() => {
      subscriber(state)
      return state.respond.subscribe(subscriber, triggerOnly)
    }, [state, ...deps])
  }

  const useListen = (listener, deps) => {
    const state = useStore()
  
    useEffect(() => {
      listener(state)
      return state.respond.listen(listener)
    }, [state, ...deps])
  }

  
  return {
    id,
    useStore,
    useRespond,
    useSubscribe,
    useListen,
    respond: (...args) => memo(respond(...args)),
  }
}


let idCounter = 0

function createUniqueModuleId() {
  return (idCounter++).toString()
}
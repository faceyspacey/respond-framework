import { useContext, memo, forwardRef, useEffect } from 'react'
import sliceBranch from '../utils/sliceBranch.js'
import useSnapshot from '../proxy/useSnapshot.js'
import RespondContext from './context.js'


export default (id = createUniqueModuleId()) => {
  const useStore = () => {
    const top = useContext(RespondContext)

    const { branchLocatorsById, branches } = top.respond
    const branch = branchLocatorsById[id]

    return branches[branch]
  }


  const useRespond = (NAME) => {
    const top = useContext(RespondContext)
    const { branchLocatorsById, branches } = top.respond
    
    const branch = branchLocatorsById[id]
    const mod = branches[branch]

    return mod.respond.isolated
      ? useSnapshot(mod, undefined, NAME) // optimization: reactive crawl from top on state changes is not necessary in useSnapshot, so we can pre-slice
      : sliceBranch(useSnapshot(top, undefined, NAME), branch) // props depend on parent state, accessed via this[_parentSymbol] in generated selectors
  }


  const respond = (Component, name = Component.name) => {
    const { length } = Component

    if (length <= 1) return Component
    
    if (length === 3) {
      const { [name]: ComponentWithName } = {
        [name]: forwardRef(function(props, ref) {
          return Component(props, useRespond(name), ref)
        })
      }
  
      return ComponentWithName
    }

    const { [name]: ComponentWithName } = {
      [name]: function(props) {
        return Component(props, useRespond(name))
      }
    }

    return ComponentWithName
  }


  const useSubscribe = (subscriber, deps = [], triggerOnly) => {
    const state = useStore()
  
    useEffect(() => {
      subscriber(state)
      return state.respond.subscribe(subscriber, triggerOnly)
    }, deps)
  }

  const useListen = (listener, deps = []) => {
    const state = useStore()
  
    useEffect(() => {
      listener(state)
      return state.respond.listen(() => listener(state))
    }, deps)
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
import { useContext, memo, forwardRef, useEffect } from 'react'
import sliceBranch from '../createModule/helpers/sliceBranch.js'
import useSnapshot from '../proxy/useSnapshot.js'
import RespondContext from './context.js'


export default (id = createUniqueModuleId()) => {
  const useStore = () => {
    const { respond } = useContext(RespondContext)

    const { branchLocatorsById, branches } = respond
    const branch = branchLocatorsById[id]

    return branches[branch]
  }


  const useRespond = () => {
    const { respond } = useContext(RespondContext)
    const { branchLocatorsById, branches } = respond
    
    const branch = branchLocatorsById[id]
    const mod = branches[branch]

    const { dependedBranch, branchDiff } = mod.respond
    if (dependedBranch === undefined) return useSnapshot(mod)

    const depMod = branches[dependedBranch]
    const snap = useSnapshot(depMod)

    return sliceBranch(snap, branchDiff)
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


  const useSubscribe = (subscriber, deps = [], allReductions) => {
    const state = useStore()
    const { respond } = state

    useEffect(() => {
      subscriber(state)
      return respond.subscribe(subscriber, allReductions)
    }, [...deps, respond]) // trigger re-render on hmr
  }

  const useListen = (listener, deps = []) => {
    const state = useStore()
    const { respond } = state
    
    useEffect(() => {
      listener(state)
      return respond.listen(() => listener(state))
    }, [...deps, respond])
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
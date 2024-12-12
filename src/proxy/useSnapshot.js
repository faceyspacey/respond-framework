import { useSyncExternalStore, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import createSnapProxy from './createSnapProxy.js'
import isChanged from './utils/isChanged.js'


export default (proxy, snappingPrevState, NAME) => {
  const last = useRef()
  const respond = proxy.respond

  const subscribe = snappingPrevState
    ? useCallback(cb => respond.subscribe(cb, true), [respond]) // subscribe to only reduces of trigger events, as prevState only changes then
    : useCallback(cb => respond.listen(cb),          [respond]) // standard listening to all proxy state changes

  const createSnapshot = snappingPrevState ? () => proxy.prevState : () => respond.snapshot() // proxy.prevState is already a snapshot, created in triggerPlugin.js

  const getSnapshot = () => {
    console.log('getSnapshot', snappingPrevState ? 'prevState' : NAME)
    const next = createSnapshot()
    const { snapshot, affected } = last.current ?? {}
    const changed = inRender || !last.current || isChanged(snapshot, next, affected)
    return changed ? next : snapshot // not changed -- referentially equal
  }

  let inRender = true
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, createSnapshot)
  inRender = false

  const affected = new WeakMap
  const cache = useMemo(() => new WeakMap, []) // per-hook proxy cache

  useLayoutEffect(() => {
    last.current = { snapshot, affected }
  })

  return createSnapProxy(snapshot, { affected, cache })
}
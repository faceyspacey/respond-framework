import { useSyncExternalStore, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import createSnapProxy from './createSnapProxy.js'
import isChanged from './utils/isChanged.js'


export default (func, respond, dependencies = []) => {
  const last = useRef()

  const subscribe = useCallback(cb => respond.listen(cb), [respond]) // standard listening to all proxy state changes
  
  const createSnapshot = () => respond.snapshot()

  const getSnapshot = () => {
    const next = createSnapshot()
    const { snapshot, affected } = last.current ?? {}
    const changed = inRender || !last.current || isChanged(snapshot, next, affected)
    return changed ? next : snapshot // not changed -- referentially equal
  }

  let inRender = true
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, createSnapshot)
  inRender = false

  const deps = useMemo(() => dependencies, dependencies)
  const cache = useMemo(() => new WeakMap, [])
  const affected = useMemo(() => new WeakMap, [snapshot, deps]) 

  const changed = affected !== last.current?.affected // changes when either snapshot or deps changes
  const memoized = changed ? func(createSnapProxy(snapshot, { affected, cache }), ...deps) : last.current.memoized

  useLayoutEffect(() => {
    last.current = { snapshot, affected, memoized, deps }
  })

  return memoized
}
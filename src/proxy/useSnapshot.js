import { useSyncExternalStore, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import createSnapProxy from './createSnapProxy.js'
import isChanged from './utils/isChanged.js'


export default (proxy, snapPrevState) => {
  const last = useRef()
  const respond = proxy.respond

  const subscribe = snapPrevState
    ? useCallback(cb => respond.subscribe(cb, true), [respond])
    : useCallback(cb => respond.listen(cb, proxy), [proxy])

  const createSnapshot = snapPrevState ? () => proxy.prevState : () => respond.snapshot(proxy)

  const getSnapshot = () => {
    const next = createSnapshot()
    const { snapshot, affected } = last.current ?? {}

    return inRender || !last.current || isChanged(snapshot, next, affected)
      ? next
      : last.current.snapshot // not changed -- referentially equal
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
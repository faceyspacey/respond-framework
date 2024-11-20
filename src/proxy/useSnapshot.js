import { useSyncExternalStore, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import createSnapProxy from './createSnapProxy.js'
import isChanged from './utils/isChanged.js'


export default proxy => {
  const last = useRef()
  const respond = proxy.respond

  const subscribe = useCallback(cb => respond.subscribeAll(proxy, cb), [proxy])
  const getServerSnapshot = () => respond.snapshot(proxy)
  const getSnapshot = () => {
    const next = respond.snapshot(proxy)
    const { snapshot, affected } = last.current ?? {}

    return inRender || !last.current || isChanged(snapshot, next, affected)
      ? next
      : last.current.snapshot // not changed -- referentially equal
  }

  let inRender = true
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  inRender = false

  const affected = new WeakMap
  const cache = useMemo(() => new WeakMap, []) // per-hook proxy cache

  useLayoutEffect(() => {
    last.current = { snapshot, affected }
  })

  return createSnapProxy(snapshot, { affected, cache })
}
import { useSyncExternalStore, useRef, useCallback, useEffect, useMemo } from 'react'
import createSnapProxy from './createSnapProxy.js'
import createSnapshot from './utils/snapshot.js'
import isChanged from './utils/isChanged.js'
import sub from './utils/subscribe.js'


export default (proxy, sync, store) => {
  const last = useRef()

  const subscribe = useCallback(cb => sub(proxy, cb, sync), [proxy, sync])
  const getServerSnapshot = () => createSnapshot(proxy)
  const getSnapshot = () => {
    const next = createSnapshot(proxy)
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

  const state = { affected, cache }

  useEffect(() => last.current = { snapshot, affected })

  return createSnapProxy(snapshot, state, store)
}
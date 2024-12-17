import { useSyncExternalStore, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import createSnapProxy from './createSnapProxy.js'
import isChanged from './helpers/isChanged.js'


export default proxy => {
  const last = useRef()
  const respond = proxy.respond

  const subscribe = useCallback(cb => respond.listen(cb), [respond])

  const getSnapshot = () => {
    const next = respond.snapshot()
    const { snapshot, affected } = last.current ?? {}
    return inRender || isChanged(snapshot, next, affected) ? next : snapshot // not changed -- referentially equal
  }

  let inRender = true
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, respond.snapshot)
  inRender = false

  const affected = new WeakMap
  const cache = useMemo(() => new WeakMap, []) // per-hook proxy cache

  useLayoutEffect(() => {
    last.current = { snapshot, affected }
  })

  return createSnapProxy(snapshot, { affected, cache })
}
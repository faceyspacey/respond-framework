import { use, useRef, useCallback, useEffect, useMemo, useDebugValue } from 'react'
import * as useSyncExternalStoreExports from 'use-sync-external-store/shim'
import { snapshot, subscribe } from './vanilla.js'
import { createProxy as createProxyToCompare, isChanged, affectedToPathList } from './proxy-compare.js'

const { useSyncExternalStore } = useSyncExternalStoreExports
const targetCache = new WeakMap()


export function useSnapshot(proxyObject, options = {}) {
  const { sync, selectors, modulePaths } = options

  const lastSnapshot = useRef()
  const lastAffected = useRef()

  let inRender = true

  const currSnapshot = useSyncExternalStore(
    useCallback(
      (callback) => {
        const unsub = subscribe(proxyObject, callback, sync || process.env.NODE_ENV === 'test' || window.isFastReplay)
        // callback() // Note: do we really need this? -- it appears not
        return unsub
      },
      [proxyObject, sync]
    ),
    () => {
      const nextSnapshot = snapshot(proxyObject, use)

      try {
        if (!inRender && lastSnapshot.current && lastAffected.current && !isChanged(
          lastSnapshot.current,
          nextSnapshot,
          lastAffected.current,
          new WeakMap()
        )) {
          return lastSnapshot.current // not changed
        }
      } catch (e) {} // ignore if a promise or something is thrown

      return nextSnapshot
    },
    () => snapshot(proxyObject, use)
  )

  inRender = false

  const currAffected = new WeakMap()

  useEffect(() => {
    lastSnapshot.current = currSnapshot
    lastAffected.current = currAffected
  })

  // if (process.env.NODE_ENV !== 'production') {
  //   useAffectedDebugValue(currSnapshot, currAffected)
  // }

  const proxyCache = useMemo(() => new WeakMap(), []) // per-hook proxyCache

  return createProxyToCompare(
    currSnapshot,
    currAffected,
    proxyCache,
    targetCache,
    selectors,
    modulePaths
  )
}


const useAffectedDebugValue = (state, affected) => {
  const pathList = useRef()

  useEffect(() => {
    pathList.current = affectedToPathList(state, affected, true)
  })

  useDebugValue(pathList.current)
}
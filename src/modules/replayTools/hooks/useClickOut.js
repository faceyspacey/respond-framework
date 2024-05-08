import { useRef, useCallback, useEffect } from 'react'


export default (set, open) => {
  const ref = useRef()
  
  const hide = useCallback(e => {
    if (!open || ref.current?.contains(e.target)) return
    set(false)
  }, [set, open])

  useEffect(() => {
    window.addEventListener?.('mousedown', hide)
    return () => window.removeEventListener?.('mousedown', hide)
  }, [hide])

  return ref
}
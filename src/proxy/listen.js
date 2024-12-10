import { isTest } from '../utils/bools.js'
import { syncRef } from '../store/plugins/edit/index.js'


export default function listen(callback, proxy = this.state) {  
  const { listeners } = this.versionListeners.get(proxy)
  const cb = isTest ? callback : batch(callback)

  listeners.add(cb)
  
  return () => listeners.delete(cb)
}


const batch = callback => {
  let pending

  return () => {
    if (syncRef.sync) return callback()
    if (pending) return

    pending = queueMicrotask(() => {
      pending = undefined
      callback()
    })
  }
}
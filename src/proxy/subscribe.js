import { proxyStates } from './utils/helpers.js'
import { isTest } from '../utils/bools.js'


export default (proxy, callback, sync) => {
  sync ||= isTest || window.isFastReplay
  
  const { listeners } = proxyStates.get(proxy)
  const batched = sync ? callback : batch(callback)

  listeners.add(batched)
  
  return () => listeners.delete(batched)
}


const batch = callback => {
  let pending

  return () => {
    if (pending) return

    pending = Promise.resolve().then(() => {
      pending = undefined
      callback()
    })
  }
}
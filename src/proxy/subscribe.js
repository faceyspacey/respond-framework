import { proxyStates } from './utils/helpers.js'
import { isTest } from '../utils/bools.js'
import { syncRef } from '../store/plugins/edit/index.js'


export default (proxy, callback) => {  
  const { listeners } = proxyStates.get(proxy)
  const batched = isTest ? callback : batch(callback)

  listeners.add(batched)
  
  return () => listeners.delete(batched)
}


const batch = callback => {
  let pending

  return () => {
    if (syncRef.sync) return callback()
    if (pending) return

    pending = Promise.resolve().then(() => {
      pending = undefined
      callback()
    })
  }
}
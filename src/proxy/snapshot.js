import createSnapshot from './utils/createSnapshot.js'
import { proxyStates } from './utils/helpers.js'

export default (proxy, store) => {
  const { orig, getVersion, cache } = proxyStates.get(proxy)
  return createSnapshot(orig, getVersion(), cache.snap, store)
}
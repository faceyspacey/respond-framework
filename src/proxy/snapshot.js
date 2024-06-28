import createSnapshot from './utils/createSnapshot.js'
import { proxyStates } from './utils/helpers.js'

export default proxy => {
  const { orig, getVersion, cache } = proxyStates.get(proxy)
  return createSnapshot(orig, getVersion(), cache.snap)
}
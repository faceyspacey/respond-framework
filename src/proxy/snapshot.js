import createSnapshot from './utils/createSnapshot.js'
import { proxyStates } from './utils/helpers.js'

export default proxy => {
  const { target, getVersion, cache } = proxyStates.get(proxy)
  return createSnapshot(target, getVersion(), cache.snap)
}
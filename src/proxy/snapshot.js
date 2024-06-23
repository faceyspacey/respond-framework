import { proxyStates } from './utils/helpers.js'

export default proxy => {
  const { createSnapshot, target, getVersion } = proxyStates.get(proxy)
  return createSnapshot(target, getVersion())
}
import { proxyStates } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'

let highestVersion = 0


export default (orig, store, parent, notifyParent, path = '', cache = { proxy: new WeakMap, snap: new WeakMap }) => {
  const found = cache.proxy.get(orig)
  if (found) return found

  const listeners = new Set()
  let version = highestVersion

  const notify = (next = ++highestVersion) => {
    if (version === next) return
    version = next
    listeners.forEach(listener => listener(version))
  }

  const handler = createHandler(notify, store, parent, path, cache)
  const proxy = new Proxy(orig, handler)

  cache.proxy.set(orig, proxy)
  proxyStates.set(proxy, { orig, notify, listeners, cache, getVersion: () => version })

  if (notifyParent) listeners.add(notifyParent)

  return proxy
}
import { proxyStates } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'

let highestVersion = 0

window.proxyStates = proxyStates
export default (orig, store, parent, notifyParent, path = '', cache = (window.weakMaps ??= { proxy: new WeakMap, snap: new WeakMap })) => {
  const found = cache.proxy.get(orig)
  if (found) return found

  const listeners = new Set()
  let version = highestVersion

  const notify = (next = ++highestVersion) => {
    if (version === next) return
    version = next
    listeners.forEach(listener => listener(version))
  }

  const remove = notifyParent => {
    listeners.delete(notifyParent)
    if (listeners.size) return
    Object.values(orig).forEach(v => proxyStates.get(v)?.remove(notify))
  }

  const proxy = createHandler(orig, notify, store, parent, path, cache)

  cache.proxy.set(orig, proxy)
  proxyStates.set(proxy, { orig, notify, listeners, remove, cache, get version() { return version } })

  if (notifyParent) listeners.add(notifyParent)

  return proxy
}
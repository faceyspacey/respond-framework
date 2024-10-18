import { proxyStates } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'

let highestVersion = 0


export default (o, notifyParent, cache = { proxy: new WeakMap, snap: new WeakMap }, parent) => {
  const found = cache.proxy.get(o)
  if (found) return found

  const listeners = new Set
  let version = highestVersion

  const notify = (next = ++highestVersion) => {
    if (version === next) return
    version = next
    listeners.forEach(listener => listener(version))
  }

  const remove = notifyParent => {
    listeners.delete(notifyParent)
    if (listeners.size) return
    Object.values(o).forEach(v => proxyStates.get(v)?.remove(notify))
  }

  const proxy = new Proxy(o, createHandler(notify, cache.proxy))

  cache.proxy.set(o, proxy)
  proxyStates.set(proxy, { orig: o, notify, listeners, remove, cache, get version() { return version } })

  if (notifyParent) listeners.add(notifyParent)

  return proxy
}
import { proxyStates } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'

let highestVersion = 0


export default (target, store) => {
  const proxy = new WeakMap
  const snap = new WeakMap

  const cache = { proxy, snap }

  return createProxy(target, store, cache)
}


export function createProxy(target, store, cache, path = '', parent) {
  const found = cache.proxy.get(target)
  if (found) return found

  const listeners = new Set()
  let version = highestVersion

  const addListener = listener => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const notify = (next = ++highestVersion) => {
    if (version === next) return
    version = next
    listeners.forEach(listener => listener(version))
  }

  const handler = createHandler(notify, listeners, store, cache, path, parent)
  const proxy = new Proxy(target, handler)

  cache.proxy.set(target, proxy)
  proxyStates.set(proxy, { target, notify, addListener, cache, getVersion: () => version })

  const descriptors = Object.getOwnPropertyDescriptors(target)

  Reflect.ownKeys(target).forEach(k => {
    if (!descriptors[k].writable) return
    proxy[k] = target[k]
  })

  const notifyParent = proxyStates.get(parent)?.notify ?? function() {}
  addListener(notifyParent)

  return proxy
}
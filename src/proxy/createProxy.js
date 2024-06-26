import { proxyStates } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'

let highestVersion = 0


export default (target, store, parent, path = '', cache = { proxy: new WeakMap, snap: new WeakMap }) => {
  const found = cache.proxy.get(target)
  if (found) return found

  const listeners = new Set()
  let version = highestVersion

  const notify = (next = ++highestVersion) => {
    if (version === next) return
    version = next
    listeners.forEach(listener => listener(version))
  }

  const handler = createHandler(notify, listeners, store, parent, path, cache)
  const proxy = new Proxy(target, handler)

  cache.proxy.set(target, proxy)
  proxyStates.set(proxy, { target, notify, listeners, cache, getVersion: () => version })

  const descriptors = Object.getOwnPropertyDescriptors(target)

  Reflect.ownKeys(target).forEach(k => {
    if (!descriptors[k].writable) return
    proxy[k] = target[k]
  })

  return proxy
}
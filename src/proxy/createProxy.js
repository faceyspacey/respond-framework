import { proxyStates } from './utils/helpers.js'
import createHandler from './utils/createHandler.js'

const cache = new WeakMap
let highestVersion = 0


export default (target, store, path = '', parent) => {
  const found = cache.get(target)
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

  const init = () => listeners.size === 0
  const getVersion = () => version

  const handler = createHandler(cache, notify, init, parent, store, path)
  const proxy = new Proxy(target, handler)

  cache.set(target, proxy)
  proxyStates.set(proxy, { target, notify, addListener, createSnapshot, getVersion })

  Reflect.ownKeys(target).forEach(k => proxy[k] = target[k])

  const notifyParent = proxyStates.get(parent)?.notify ?? function() {}
  addListener(notifyParent)

  return proxy
}
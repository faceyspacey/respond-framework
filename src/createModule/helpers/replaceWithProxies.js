import { _parent } from '../reserved.js'


export default function replaceWithProxies(proxy, parent = {}, b = '') {
  const proto = Object.getPrototypeOf(proxy)
  proto[_parent] = parent

  const { respond } = proxy

  respond.state = respond.branches[b] = proxy // replace module states with proxy
  proxy.moduleKeys.forEach(k => replaceWithProxies(proxy[k], proxy, b ? `${b}.${k}` : k))
}
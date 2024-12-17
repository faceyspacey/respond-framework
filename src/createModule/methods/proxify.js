import createProxy from '../../proxy/createProxy.js'
import replaceWithProxies from '../helpers/replaceWithProxies.js'


export default function proxify() {
  const proxy = createProxy(this.topState, this.versionListeners, this.refIds)
  replaceWithProxies(proxy)
  return window.state = proxy
}
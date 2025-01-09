import createProxy from '../../proxy/createProxy.js'
import replaceWithProxies from '../helpers/replaceWithProxies.js'


export default function proxify() {
  if (this.profixied) return this.state

  const proxy = createProxy(this.topState, this.versionNotifiers, this.proxyCache, this.refIds)
  replaceWithProxies(proxy)

  this.profixied = true
  
  return window.state = this.state = proxy
}
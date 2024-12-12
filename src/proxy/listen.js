export default function listen(callback, proxy = this.state) {  
  const { listeners } = this.versionListeners.get(proxy)

  callback.branch = this.branch

  listeners.add(callback)
  return () => listeners.delete(callback)
}
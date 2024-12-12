export default function listen(callback, proxy = this.getStore()) {  
  if (this.moduleName === 'replayTools') {
    this.replayToolsListeners.add(callback)
    return () => this.replayToolsListeners.delete(callback)
  }

  const { listeners } = this.versionListeners.get(proxy)

  callback.respond = this

  listeners.add(callback)
  return () => listeners.delete(callback)
}
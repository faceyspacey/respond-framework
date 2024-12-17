export default function listen(callback) {
  this.listeners.add(callback)
  return () => this.listeners.delete(callback)
}
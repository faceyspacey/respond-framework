export default event => {
  if (event.isNamespace !== undefined) return event.isNamespace
  
  const keys = Object.keys(event)
  if (keys.length === 0) return false

  const isEvent = event.path || keys.find(k => typeof event[k] === 'function')
  return !isEvent
}
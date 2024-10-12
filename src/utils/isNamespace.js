export default (event, isBuiltIns) => {
  if (isBuiltIns) return false
  if (!event) return false
  if (event.path) return false
  if (event.namespace !== undefined) return event.namespace

  const keys = Object.keys(event)
  return keys.length === 0 ? false : !keys.find(k => typeof event[k] === 'function')
}
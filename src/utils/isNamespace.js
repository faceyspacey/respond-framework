export default config => {
  if (!config) return false
  if (config.pattern) return false
  if (config.namespace !== undefined) return config.namespace
  
  const keys = Object.keys(config)
  return keys.length === 0 ? false : !keys.find(k => knownKeys[k] || typeof config[k] === 'function')
}


const knownKeys = {
  sync: true,
  kind: true,
}
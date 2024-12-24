export default (models = {}) => {
  if (!Array.isArray(models)) return models

  const [shared = {}, main = {}] = models // main can be either client or server-specific models
  const combined = {}

  for (const k in { ...shared, ...main }) {
    combined[k] = Object.assign({}, gopd(shared[k]), gopd(main[k]))
  }

  return combined
}



const gopd = obj => obj && Object.getOwnPropertyDescriptors(obj)
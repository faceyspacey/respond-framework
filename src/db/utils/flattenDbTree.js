export function flattenControllers(db, controllers = {}, b = '') {
  controllers[b] = db.controllers ?? {}
  db.moduleKeys.forEach(k => flattenControllers(db[k], controllers, b ? `${b}.${k}` : k))
  return controllers // 2d: controllers[branch][controllerName]
}


export function flattenModels(db, modelsByBranchType = {}, b = '') {
  const models = db.models ?? {}

  Object.keys(models).forEach(k => {
    modelsByBranchType[b + '_' + k] = models[k]
  })

  db.moduleKeys.forEach(k => flattenModels(db[k], modelsByBranchType, b ? `${b}.${k}` : k))
  
  return modelsByBranchType // 1d: modelsByBranchType[doc.__branchType]
}
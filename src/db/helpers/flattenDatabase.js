export default function flattenDatabase(db = {}, branches = {}, b = '') {
  branches[b] = db
  db.moduleKeys.forEach(k => flattenDatabase(db[k], branches, b ? `${b}.${k}` : k))
  return branches // 2d: branches[branch][table]
}


export function flattenModels(db, modelsByBranchType = {}, b = '') {
  const models = db.models ?? {}

  Object.keys(models).forEach(k => {
    modelsByBranchType[b + '_' + k] = models[k]
  })

  db.moduleKeys.forEach(k => flattenModels(db[k], modelsByBranchType, b ? `${b}.${k}` : k))
  
  return modelsByBranchType // 1d: modelsByBranchType[doc.__branchType]
}

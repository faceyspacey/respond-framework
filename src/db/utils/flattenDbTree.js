export function flattenModels(db, modelsByBranchType = {}, b = '') {
  const models = db.models ?? {}

  Object.keys(models).forEach(k => {
    modelsByBranchType[b + '_' + k] = models[k]
  })

  db.moduleKeys.forEach(k => flattenModels(db[k], modelsByBranchType, b ? `${b}.${k}` : k))
  
  return modelsByBranchType // 1d: modelsByBranchType[doc.__branchType]
}


export function flattenDatabase(db = {}, branches = {}, b = '') {
  branches[b] = createTableConstructors(db)
  db.moduleKeys.forEach(k => flattenDatabase(db[k], branches, b ? `${b}.${k}` : k))
  return branches // 2d: branches[branch][table]
}


export const createTableConstructors = db =>
  Object.keys(db).reduce((acc, k) => {
    function Table() {}
    Table.prototype = db[k] // table methods available on an instance (similar to controllers) so that this.context and this.user is available (but only to the initially called table query/mutation method; on the other hand, when called within this method, the `this` context won't exist)
    acc[k] = Table
    return acc
  }, {})
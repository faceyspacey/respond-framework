import { isDev } from '../../utils.js'
import replayTools from '../../modules/replayTools/db.js'


export default function flattenDbTreeByBranchBy(key, db = { moduleKeys: [] }) {
  if (isDev && !db.replayTools) {
    db.moduleKeys.push('replayTools')
    db.replayTools = replayTools
  }

  return flatten(key, db)
}


function flatten(key = 'controllers', db, hash = {}, b = '') {
  hash[b] = db[key] ?? {}
  db.moduleKeys.forEach(k => flatten(key, db[k], hash, b ? `${b}.${k}` : k))
  return hash
}
import { isTest } from '../../utils.js'

export default (settings, { seed = {} } = {}, db = {}) => {
  db.tableNames.forEach(k => {
    db[k].insertSeed(seed[k] ?? {})
  })
}
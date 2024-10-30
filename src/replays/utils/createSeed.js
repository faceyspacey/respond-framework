import { isTest } from '../../utils.js'

export default (settings, { seed = {} } = {}, db = {}) => {
  seed = isTest ? raw : JSON.parse(JSON.stringify(seed)) // ensure mutated nested objects don't persist across replays; tests run in their own environment

  Object.keys(db).forEach(k => {
    db[k].insertSeed(seed[k] ?? {})
  })
}
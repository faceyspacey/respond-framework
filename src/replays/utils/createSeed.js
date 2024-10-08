import { isTest } from '../../utils.js'

export default (settings, { seed = {} }) => {
  seed = isTest ? raw : JSON.parse(JSON.stringify(seed)) // ensure mutated nested objects don't persist across replays; tests run in their own environment

  const db = window.db || {}

  return Object.keys(db).reduce((acc, k) => {
    acc[k] = db[k].insertSeed(seed[k] || {})
    return acc
  }, {})
}
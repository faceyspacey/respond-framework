import cloneDeep from '../../utils/cloneDeep.js'


export default (settings, { seed = {} }) => {
  seed = cloneDeep(seed) // ensure mutated nested objects don't persist across replays

  const db = window.db || {}

  return Object.keys(db).reduce((acc, k) => {
    acc[k] = db[k].insertSeed(seed[k] || {})
    return acc
  }, {})
}
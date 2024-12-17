import nestAtBranch from '../../../store/helpers/nestAtBranch.js'


export default settings => {
  const references = new Map

  return Object.keys(settings).reduce((acc, k) => {
    const mod = settings[k]

    if (references.has(mod)) return acc // inherited settings share the same reference, and won't need to appear more than once
    references.set(mod, true)

    const clean = JSON.parse(JSON.stringify(mod)) // remove undefined keys
    if (Object.keys(clean).length === 0) return acc

    if (k === '') return { ...clean } // top module's settings becomes the root object, and it will be first, as settings form is pre-sorted ancestors first

    nestAtBranch(k, clean, acc) // if a parent reference is ignored because it shares the same replay settings as the grand parent, a grand child with its own replays will be nested in an empty parent object by this function
    return acc
  }, {})
}
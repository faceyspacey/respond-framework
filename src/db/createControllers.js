import Parent from './Controller.js'
import createControllerDefault from './utils/createControllerDefault.js'
import mergeProps from './utils/mergeProps.js'


export default function createControllers({ options, ...controllers }, hash = {}) {
  const create = options?.createController ?? createControllerDefault

  for (const _name in controllers) {
    const Child = { _name, _namePlural: _name + 's', ...controllers[_name] }
    hash[_name] = create(Child, Parent)
  }

  return hash
}


export const createControllersTree = ({ modules = {}, props = {}, ...db }, hash = {}, p = '') => {
  hash[p] = {}
  mergeProps(db, props)
  createControllers(db, hash[p])
  
  Object.keys(modules).forEach(k => {
    createControllersTree(modules[k], hash, p ? `${p}.${k}` : k)
  })

  return hash
}
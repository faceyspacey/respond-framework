import Parent from './Controller.js'
import createControllerDefault from './utils/createControllerDefault.js'
import mergeProps from './utils/mergeProps.js'
import secretMock from '../db/secret.mock.js'


export default function createControllers(controllers, db, replays, options = {}) {
  const hash = {}
  
  const {
    secret = secretMock,
    createController = createControllerDefault
  } = options

  const descriptors = {
    db:       { enumerable: false, configurable: true, value: db      },
    replays:  { enumerable: false, configurable: true, value: replays },
  }

  for (const _name in controllers) {
    const Child = { _name, _namePlural: _name + 's', secret, ...controllers[_name] }
    function Controller(request = {}) { this.request = request }
    Controller.prototype = Object.defineProperties(createController(Child, Parent), descriptors)
    hash[_name] = Controller
  }

  return hash
}


export const createControllersTree = ({ modules = {}, props = {}, ...db }, hash = {}, b = '') => {
  hash[b] = {}
  mergeProps(db, props)
  createControllers(db, hash[b])
  
  Object.keys(modules).forEach(k => {
    createControllersTree(modules[k], undefined, hash, b ? `${b}.${k}` : k)
  })

  return hash
}
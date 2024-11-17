import Parent from './Controller.js'
import createController from './utils/createControllerDefault.js'
import secretMock from '../db/secret.mock.js'


export default function createControllers(controllers, config, descriptors, create = createController) {
  const hash = {}
  const secret = config.secret ?? secretMock

  for (const _name in controllers) {
    const Child = { _name, _namePlural: _name + 's', secret, ...controllers[_name] }
    function Controller(request = {}, io) { this.request = request; this.io = io }
    Controller.prototype = Object.defineProperties(create(Child, Parent), descriptors)
    hash[_name] = Controller
  }

  descriptors.controllers = { enumerable: false, value: hash }

  return hash
}
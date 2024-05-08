import Parent from '../Controller.js'
import createControllerDefault from './createControllerDefault.js'


export default topModule => {
  const modules = {}
  createModule(topModule, modules)
  return modules
}


export const createModule = (mod, modules, modulePath = '') => {
  createControllers(mod, modules, modulePath)

  if (!mod.modules) return

  Object.keys(mod.modules).forEach(k => {
    const child = mod.modules[k]
    const path = modulePath ? `${modulePath}.${k}` : k

    createModule(child, modules, path)
  })
}


const createControllers = (mod, modules, path = '') =>  {
  const { controllers = {}, createController = createControllerDefault } = mod.db || {}

  modules[path] = {}

  for (const controller in controllers) {
    const Child = { 
      name: controller,
      namePlural: controller + 's',
      ...controllers[controller],
    }

    modules[path][controller] = createController(Child, Parent)
  }
}
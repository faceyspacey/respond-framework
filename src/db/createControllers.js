import Parent from './Controller.js'
import createControllerDefault from './utils/createControllerDefault.js'


export default (topModule, options = {}) => {
  if (!options.nested) {
    const controllers = topModule.db?.controllers || topModule // controllers can be passed in directly server-side in a flat structure, rather than in our nested module structure
    return createControllersFlat(controllers, options.createController)
  }

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
      _name: controller,
      _namePlural: controller + 's',
      ...controllers[controller],
    }

    modules[path][controller] = createController(Child, Parent)
  }
}



// for passing to createApi.js server-side in production, when you aren't using a tree of controllers by modulePath

const createControllersFlat = (controllers = {}, createController = createControllerDefault) =>  {
  const flat = {}

  for (const controller in controllers) {
    const Child = { 
      _name: controller,
      _namePlural: controller + 's',
      ...controllers[controller],
      controllers: flat,
    }

    flat[controller] = createController(Child, Parent)
  }

  return flat
}
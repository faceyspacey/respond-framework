import Parent from './Controller.js'
import createControllerDefault from './utils/createControllerDefault.js'


export default (topModule, topModuleOriginal = topModule) => {
  if (!topModuleOriginal?.db?.nested) {
    return createControllersFlat(topModuleOriginal)
  }

  const modules = {}
  createModule(topModule, modules)
  return modules
}




export const createModule = (mod, modules, modulePath = '') => {
  createControllers(mod, modules, modulePath)

  mod.moduleKeys.forEach(k => {
    const child = mod[k]
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

const createControllersFlat = mod =>  {
  const { controllers = {}, createController = createControllerDefault } = mod.db || {}
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
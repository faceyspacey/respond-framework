import Parent from './Controller.js'
import createControllerDefault from './utils/createControllerDefault.js'


export default (topModule, topModuleOriginal = topModule) =>
  topModuleOriginal?.db?.nested
    ? createModule(topModule, controllersByModulePath)
    : createControllersFlat(topModuleOriginal)




export const createModule = (mod, controllersByModulePath = {}, p = '') => {
  createControllers(mod, controllersByModulePath, p)

  mod.moduleKeys.forEach(k => {
    createModule(mod[k], controllersByModulePath, p ? `${p}.${k}` : k)
  })

  return controllersByModulePath
}


const createControllers = (mod, controllersByModulePath, path = '') =>  {
  const { controllers = {}, createController = createControllerDefault } = mod.db || {}

  controllersByModulePath[path] = {}

  for (const controller in controllers) {
    const Child = { 
      _name: controller,
      _namePlural: controller + 's',
      ...controllers[controller],
    }

    controllersByModulePath[path][controller] = createController(Child, Parent)
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
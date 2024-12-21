import * as fs from 'fs'
import * as path from 'path'


export default (folder = 'widgets', ignoreKey) => {
  folder = folder.replace(/^\./, '') // strip possible leading .
  folder = folder.replace(/^\//, '') // strip possible leading slash

  if (folder === 'widgets' && !ignoreKey) {
    ignoreKey = 'ignoredWidgets'
  }

  recurseModules('./', folder, ignoreKey)
}



const recurseModules = (moduleDir, folder, ignoreKey, ancestorConfig) => {
  const config = getConfig(moduleDir) ?? ancestorConfig
  mockModuleDirectory(moduleDir, folder, config?.[ignoreKey])

  const modulesDir = path.resolve(moduleDir, 'modules')
  if (!fs.existsSync(modulesDir)) return

  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(file => file.isDirectory())
    .map(file => file.name)
  
  moduleDirs.forEach(dir => {
    const moduleDir = path.resolve(modulesDir, dir)
    recurseModules(moduleDir, folder, ignoreKey, config)
  })
}




const mockModuleDirectory = (moduleDir, folder, ignored) => {
  const dir = path.resolve(moduleDir, folder)
  if (!fs.existsSync(dir)) return

  const files = fs.readdirSync(dir)
    .filter(name => name.endsWith('.js'))
    .filter(name => !ignored?.includes(name))

  files.forEach(name => {
    const ComponentName = name.replace('.js', '')
    const absolutePath = path.resolve(dir, name)

    jest.doMock(absolutePath, () => {
      const mod = jest.requireActual(absolutePath)

      const mock = {}

      Object.defineProperty(mock, '__esModule', { value: true })

      Object.keys(mod).forEach(k => {
        Object.defineProperty(mock, k, {
          enumerable: true,
          value: k === 'default' ? ComponentName : k
        })
      })

      return mock
    })
  })
}




const getConfig = dir => {
  const filename = path.resolve(dir, 'config/config.tests.js')
  if (!fs.existsSync(filename)) return

  const mod = jest.requireActual(filename)
  return mod.default ?? mod
}
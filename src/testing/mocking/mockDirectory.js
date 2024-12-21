import * as fs from 'fs'
import * as path from 'path'


export default (folder, ignoreKey) => {
  const moduleDirectories = createModuleDirectoriesRecursive()
  
  folder = folder.replace(/^\./, '') // strip possible leading .
  folder = folder.replace(/^\//, '') // strip possible leading slash

  moduleDirectories.forEach(baseDir => {
    mockDirectory(baseDir, folder, ignoreKey)
  })
}



const createModuleDirectoriesRecursive = (baseDir = './', dirs = [baseDir]) => {
  const modulesDir = path.resolve(baseDir, 'modules')
  if (!fs.existsSync(modulesDir)) return

  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(file => file.isDirectory())
    .map(file => file.name)
  
  moduleDirs.forEach(dir => {
    const moduleDir = path.resolve(modulesDir, dir)
    dirs.push(moduleDir)
    createModuleDirectoriesRecursive(moduleDir, dirs)
  })

  return dirs
}




const mockDirectory = (baseDir, folder, ignoreKey) => {
  const dir = path.resolve(baseDir, folder)

  if (!fs.existsSync(dir)) return
  const ignored = createIgnored(baseDir, ignoreKey)

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





const createIgnored = (dir, ignoreKey) => {
  if (!ignoreKey) return
  const filename = path.resolve(dir, 'config/config.tests.js')
  if (!fs.existsSync(filename)) return

  let mod = jest.requireActual(filename)
  mod = mod.default ?? mod
  return mod[ignoreKey]
}
import * as fs from 'fs'
import * as path from 'path'


export default (dir, ignoreKey) => {
  const moduleDirectories = createModuleDirectoriesRecursive()
  
  dir = dir.replace(/^\./, '') // strip possible leading .
  dir = dir.replace(/^\//, '') // strip possible leading slash

  moduleDirectories.forEach(baseDir => {
    mockDirectory(baseDir + '/' + dir, ignoreKey)
  })
}



const createModuleDirectoriesRecursive = (baseDir = './', dirs = [baseDir]) => {
  const modulesDir = baseDir === './' ? './modules' : baseDir + '/modules'
  if (!fs.existsSync(modulesDir)) return

  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(file => file.isDirectory())
    .map(file => file.name)
  
  moduleDirs.forEach(dir => {
    const moduleDir = modulesDir + '/' + dir
    dirs.push(moduleDir)
    createModuleDirectoriesRecursive(moduleDir, dirs)
  })

  return dirs
}




const mockDirectory = (dir, ignoreKey) => {
  if (!fs.existsSync(dir)) return
  const ignored = createIgnored(dir, ignoreKey)

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
  const filename = dir + '/configs/config.tests.js'
  if (!fs.existsSync(filename)) return
  return jest.requireActual(filename)[ignoreKey]
}
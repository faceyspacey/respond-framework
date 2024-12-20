import * as fs from 'fs'
import * as path from 'path'


export default (dir, conf) => {
  const ignored = conf?.ignored?.widgetMocks

  const files = fs.readdirSync('./' + dir)
    .filter(name => name.endsWith('.js'))
    .filter(name => !ignored?.includes(name))

  files.forEach(name => {
    const ComponentName = name.replace('.js', '')
    const filename = path.resolve(dir, name)

    jest.doMock(filename, () => {
      const mod = jest.requireActual(filename)

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
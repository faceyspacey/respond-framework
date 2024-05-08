import * as fs from 'fs'
import * as path from 'path'


export default (dir, tc) => {
  const ignored = tc?.ignored?.widgetMocks

  const files = fs.readdirSync('./' + dir)
    .filter(filename => filename.endsWith('.js'))
    .filter(filename => !ignored?.includes(filename))

  files.forEach(filename => {
    const ComponentName = filename.replace('.js', '')
    const modulePath = path.resolve(dir, filename)

    jest.doMock(modulePath, () => {
      const mod = jest.requireActual(modulePath)

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
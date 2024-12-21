import * as path from 'path'


export default (filename, digits = 4, suffix = '') => {
  let counter = 10 ** digits

  filename = filename.replace(/^\./, '')
  filename = filename.replace(/^\//, '')

  const absolutePath = path.resolve(filename)
  
  jest.doMock(absolutePath, () => ({
    __esModule: true,
    default: () => (counter++).toString().substring(1) + suffix,
  }))
}
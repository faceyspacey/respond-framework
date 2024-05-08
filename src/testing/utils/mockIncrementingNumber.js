import * as path from 'path'


export default (dir, digits = 4, suffix = '') => {
  let counter = 10 ** digits

  const directory = path.resolve(dir)

  jest.doMock(directory, () => ({
    __esModule: true,
    default: () => (counter++).toString().substring(1) + suffix,
  }))
}
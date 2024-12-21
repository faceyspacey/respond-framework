import { suffix } from '../../helpers/objectIdDevelopment.js'


export default (suf = suffix) => {
  let counter = 10000

  jest.doMock('../../helpers/objectIdDevelopment.js', () => ({
    __esModule: true,
    default: () => counter++ + suf,
  }))
}
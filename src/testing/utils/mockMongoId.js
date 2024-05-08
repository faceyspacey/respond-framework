import { suffix } from '../../utils/objectIdDevelopment.js'


export default (suf = suffix) => {
  let counter = 10000

  jest.doMock('../../utils/objectIdDevelopment.js', () => ({
    __esModule: true,
    default: () => counter++ + suf,
  }))
}
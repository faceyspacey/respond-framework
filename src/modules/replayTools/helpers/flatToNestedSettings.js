
import { nestAtModulePath } from '../../../utils/sliceByModulePath.js'


export default ({ ['']: { ...top }, ...rest }) =>
  Object.keys(rest).reduce((acc, k) => {
    nestAtModulePath(acc, k, rest[k])
    return acc
  }, top)
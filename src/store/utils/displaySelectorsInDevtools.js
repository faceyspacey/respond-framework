import { isNative } from '../../utils/bools.js'


export default opts => {
  const env = process.env.NODE_ENV
  if (env === 'test') return false
  return opts?.displaySelectorsInDevtools ?? (env !== 'development' && !isNative)
}
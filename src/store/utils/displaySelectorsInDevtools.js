import isNative from '../../utils/isNative.js'


export default opts => {
  const env = process.env.NODE_ENV
  if (env === 'test') return false

  const display = opts?.displaySelectorsInDevtools
  return display !== undefined ? display : env !== 'development' && !isNative
}
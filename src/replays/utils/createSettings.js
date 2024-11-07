import { isProd } from '../../utils/bools.js'


export default (config = {}, settings = {}) =>
  Object.keys(config).reduce((acc, k) => {
    const setting = config[k]

    if (isProd) {
      acc[k] = setting.defaultValueProduction
    }
    else if (setting.transform) {
      acc[k] = setting.transform(settings[k], config, acc, settings)
    }
    else {
      acc[k] = settings[k] ?? setting.defaultValueDevelopment
    }

    return acc
  }, {})
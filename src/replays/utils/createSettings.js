import { isProd } from '../../utils/bools.js'


export default (config = {}, settings = {}) => {
  const defaults = applyDefaultValues(config, settings)
  return { ...settings, ...defaults } // allow opts.settings not in config.replays.js
}


const applyDefaultValues = (config, settings) =>
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
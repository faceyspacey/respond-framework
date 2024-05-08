import isProd from '../../utils/isProd.js'


export default (config, settings = {}) => {
  const defaults = applyDefaultValues(config, settings)
  return { ...settings, ...defaults } // allow opts.settings not in defaults/config.replays.js
}


const applyDefaultValues = (config, settings) =>
  Object.keys(config).reduce((acc, k) => {
    const setting = config[k]
    const { transform } = setting

    if (isProd) {
      acc[k] = setting.defaultValueProduction
    }
    else if (transform) {
      acc[k] = transform(settings[k], config, acc, settings)
    }
    else {
      acc[k] = settings[k] ?? setting.defaultValueDevelopment
    }

    return acc
  }, {})
import { isProd } from '../../helpers/constants.js'


export default (config = {}, settings = {}) =>
  Object.keys(config).reduce((acc, k) => {
    const setting = config[k]

    if (isProd) {
      acc[k] = setting.defaultValueProduction
    }
    else if (setting.json) {
      acc[k] = maybeJson(settings[k])
    }
    else if (setting.transform) {
      acc[k] = setting.transform(settings[k], config, acc, settings)
    }
    else {
      acc[k] = settings[k] ?? setting.defaultValueDevelopment
    }

    return acc
  }, {})


const maybeJson = v =>
  v && typeof v === 'object'
    ? v                              // replayed from saved test, where JSON already converted       
    : v ? JSON.parse(v) : undefined  // reloaded settings from string in ReplayTools form
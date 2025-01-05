import { isProd } from '../../../helpers/constants.js'


export default (config = {}, settings = {}) =>
  Object.keys(config).reduce((acc, k) => {
    const setting = config[k]
    const v = settings[k]
    
    if (isProd) {
      acc[k] = setting.defaultValueProduction
    }
    else if (v && setting.json) {
      acc[k] = maybeJson(v)
    }
    else if (v && setting.transform) {
      acc[k] = setting.transform(v, config, acc, settings)
    }
    else if (v) {
      acc[k] = v
    }
    else {
      acc[k] = setting.defaultValueDevelopment
    }

    return acc
  }, {})


const maybeJson = v =>
  v && typeof v === 'object'
    ? v                              // replayed from saved test, where JSON already converted       
    : v ? JSON.parse(v) : undefined  // reloaded settings from string in ReplayTools form
import findSelectedOption from './findSelectedOption.js'


export default (config, settings) =>
  Object.keys(settings).reduce((acc, k) => {
    const setting = settings[k]
    const conf = config[k]

    const ignored =
      !conf ||
      conf.ignoreInTestSettings ||
      conf.builtIn ||
      setting === conf.defaultValueDevelopment ||
      conf.available?.(settings) === false ||
      isDefaultOption(conf, setting, settings) ||
      isUnavailableOption(conf, setting, settings)

    if (!ignored) {
      acc[k] = conf.transformOut ? conf.transformOut(setting) : setting
    }

    return acc
  }, {})



const isDefaultOption = (conf, setting, settings) => {
  if (!conf.options) return false

  const options = typeof conf.options === 'function' ? conf.options(settings) : conf.options
  const defaultOption = findSelectedOption(options, undefined) // undefined will fall back to finding defaultOption

  return setting === defaultOption.value
}


const isUnavailableOption = (conf, setting, settings) => {
  if (!conf.options) return false

  const options = typeof conf.options === 'function' ? conf.options(settings) : conf.options
  return !options.find(o => o.value === setting)
}
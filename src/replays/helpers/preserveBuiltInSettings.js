export default (settings, store) => {
  const { config, settings: sets } = store.replays

  return Object.keys(config).reduce((acc, k) => {
    if (config[k].builtIn) {
      acc[k] = sets[k] // preserve builtIn settings
    }

    return acc
  }, { ...settings })
}
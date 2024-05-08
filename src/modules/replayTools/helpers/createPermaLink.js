import { settingsToSearch } from '../../../replays/helpers/restoreSettings.js'


export default (state, replays, arg) => {
  const { path, ...settings } = state.form

  const host = typeof location !== 'undefined'
    ? location.protocol + '//' + location.host
    : 'http://localhost:3000/'

  const search = settingsToSearch({ ...settings, ...arg }, replays.config)
  return host + path + search
}

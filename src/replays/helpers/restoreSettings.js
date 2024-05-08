import * as qs from 'qs'
import parseSearch from '../../utils/parseSearch.js'


export default () => {
  if (process.env.NODE_ENV === 'production') return
  if (process.env.NODE_ENV === 'test') return
  if (typeof localStorage === 'undefined') return

  const linkedSettings = parseSettingsFromSearch() // allows for sharing development links with pre-set settings
  if (linkedSettings) return linkedSettings

  const settings = localStorage.getItem('__replaySettings')
  return settings ? JSON.parse(settings) : {}
}



const parseSettingsFromSearch = () => {
  const search = typeof window !== undefined && window.location.search
  let settings = search && parseSearch(search)

  if (settings) {
    settings = Object.keys(settings).reduce((acc, k) => {
      if (k.indexOf('__') !== 0) return acc
      acc[k.slice(2)] = settings[k]
      return acc
    }, {})

    if (Object.keys(settings).length === 0) return

    localStorage.setItem('__replaySettings', JSON.stringify(settings)) // persist for refreshes
  }

  return settings
}


export const settingsToSearch = (settings, config) => {
  settings = Object.keys(settings).reduce((acc, k) => {
    const { transformOut } = config[k]
    acc['__' + k] = transformOut ? transformOut(settings[k]) : settings[k]
    return acc
  }, {})

  return '?' + qs.stringify(settings)
}

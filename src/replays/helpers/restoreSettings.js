import * as qs from 'qs'
import { parseSearch } from '../../utils/searchQuery.js'
import localStorage from '../../utils/localStorage.js'


export default async () => {
  if (process.env.NODE_ENV === 'production') return
  if (process.env.NODE_ENV === 'test') return

  const linkedSettings = parseSettingsFromSearch() // allows for sharing development links with pre-set settings
  
  if (linkedSettings) {
    const { permalink: _, ...settings } = linkedSettings // permalink is a flag that disables session restoration only once
    await localStorage.setItem('replaySettings', JSON.stringify(settings)) // persist for refreshes
    return linkedSettings
  }

  const settings = await localStorage.getItem('replaySettings')
  return settings ? JSON.parse(settings) : {}
}


const parseSettingsFromSearch = () => {
  const search = typeof window !== undefined && window.location?.search
  let settings = search && parseSearch(search)

  if (settings) {
    settings = Object.keys(settings).reduce((acc, k) => {
      if (k.indexOf('_') !== 0) return acc
      acc[k.slice(1)] = settings[k]
      return acc
    }, {})

    if (Object.keys(settings).length === 0) return
  }

  return settings
}


export const settingsToSearch = (settings, config) => {
  settings = Object.keys(settings).reduce((acc, k) => {
    const { transformOut } = config[k] || {}
    acc['_' + k] = transformOut ? transformOut(settings[k]) : settings[k]
    return acc
  }, { _permalink: true })

  return '?' + qs.stringify(settings)
}
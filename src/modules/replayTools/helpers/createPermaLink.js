import * as qs from 'qs'
import { parseSearch } from '../../../utils/searchQuery.js'



export default (state, replays) => {
  const { path, ...settings } = state.form

  const host = typeof location !== 'undefined'
    ? location.protocol + '//' + location.host
    : 'http://localhost:3000/'

  const search = settingsToSearch(settings, replays.config)

  return {
    relativeUrl: path + search,
    url: host + path + search
  }
}


const settingsToSearch = (settings, config) => {
  const query = {}

  Object.keys(settings).forEach(k => {
    const v = settings[k]
    const out = config[k]?.transformOut
    query['_' + k] = out ? out(v) : v
  })

  return '?' + qs.stringify(query)
}




export const searchToSettings = () => {
  const search = typeof window !== undefined && window.location?.search
  const query = search && parseSearch(search)

  if (!query) return

  const settings = {}

   Object.keys(query).forEach(k => {
    if (k.indexOf('_') !== 0) return
    settings[k.slice(1)] = query[k]
  })

  return Object.keys(settings).length > 0 ? settings : undefined
}
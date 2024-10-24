import * as qs from 'qs'
import { parseSearch } from '../../../utils/searchQuery.js'



export default (state, replays) => {
  const { path = '', ...settings } = state.form

  const host = typeof location !== 'undefined'
    ? location.protocol + '//' + location.host
    : 'http://localhost:3000/'

  const p = path.indexOf('#') > -1 ? path.slice(0, path.indexOf('#')) : path // permalinks can't be used in combination with userland hashes, but search queries can!
  const hash = settingsToHash(settings, replays.config)

  return {
    relativeUrl: p + hash,
    url: host + p + hash
  }
}


const settingsToHash = (settings, config) => {
  const query = {}

  Object.keys(settings).forEach(k => {
    const v = settings[k]
    const out = config[k]?.transformOut
    query[k] = out ? out(v) : v
  })

  return prefix + qs.stringify(query) 
}



export const hashToSettings = () => {
  const hash = typeof window !== undefined && window.location?.hash
  return hash?.indexOf(prefix) === 0 && parseSearch(hash.slice(length)) // use hash so search can still be used in userland
}


const prefix = '#respondPermalink:'
const length = prefix.length